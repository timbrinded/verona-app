import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

async function freePort(): Promise<number> {
  const server = createServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to allocate a test port");
  }
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  return address.port;
}

async function waitForServer(url: string): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < 30_000) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // Keep waiting until Next is ready.
    }
    await delay(500);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function stopServer(server: ChildProcessWithoutNullStreams): Promise<void> {
  if (server.exitCode !== null) return;
  server.kill("SIGTERM");
  await Promise.race([once(server, "exit"), delay(5_000).then(() => server.kill("SIGKILL"))]);
}

async function main(): Promise<void> {
  const port = Number(process.env.PLAYWRIGHT_PORT) || (await freePort());
  const baseUrl = `http://127.0.0.1:${port}`;
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const server = spawn(npx, ["next", "start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL || "file:./data/verona.db",
      TURSO_DATABASE_URL: "",
      TURSO_AUTH_TOKEN: "",
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  server.stdout.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));

  try {
    await waitForServer(baseUrl);

    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ serviceWorkers: "block" });
      const page = await context.newPage();

      await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
      const api = await page.evaluate(async () => {
        const response = await fetch("/api/places");
        return {
          status: response.status,
          source: response.headers.get("x-places-source"),
          count: ((await response.json()) as unknown[]).length,
        };
      });
      if (api.status !== 200 || api.source !== "sqlite" || api.count !== 54) {
        throw new Error(`Unexpected API result ${JSON.stringify(api)}`);
      }

      await page.waitForSelector(".mapboxgl-canvas", { timeout: 20_000 });
      await page.waitForFunction(() => document.querySelectorAll(".place-marker").length >= 10);
      await page.getByLabel("Toggle filters").click();
      await page.getByRole("button", { name: /Pub/ }).click();
      await page.waitForFunction(() => document.body.textContent?.includes("14 places"));

      const fallbackPage = await context.newPage();
      await fallbackPage.route("**/api/places", (route) =>
        route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"forced"}' }),
      );
      await fallbackPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await fallbackPage.getByText("Offline mode").waitFor({ timeout: 10_000 });
      await fallbackPage.waitForFunction(() => document.querySelectorAll(".place-marker").length >= 10);
    } finally {
      await browser.close();
    }
  } finally {
    await stopServer(server);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
