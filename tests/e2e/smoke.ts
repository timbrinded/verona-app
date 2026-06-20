import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { chromium } from "playwright";

const smokeTimeout = setTimeout(() => {
  console.error("[smoke] Timed out after 90 seconds");
  process.exit(1);
}, 90_000);

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
  if (process.platform === "win32" || !server.pid) {
    server.kill("SIGTERM");
    await Promise.race([once(server, "exit"), delay(5_000).then(() => server.kill("SIGKILL"))]);
    return;
  }

  try {
    process.kill(-server.pid, "SIGTERM");
  } catch {
    server.kill("SIGTERM");
  }
  await Promise.race([
    once(server, "exit"),
    delay(5_000).then(() => {
      try {
        process.kill(-server.pid!, "SIGKILL");
      } catch {
        server.kill("SIGKILL");
      }
    }),
  ]);
}

async function main(): Promise<void> {
  const port = Number(process.env.PLAYWRIGHT_PORT) || (await freePort());
  const baseUrl = `http://127.0.0.1:${port}`;
  const nextBin = join(process.cwd(), "node_modules", ".bin", process.platform === "win32" ? "next.cmd" : "next");
  const server = spawn(nextBin, ["start", "-p", String(port), "-H", "127.0.0.1"], {
    cwd: process.cwd(),
    detached: process.platform !== "win32",
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
    console.log(`[smoke] Server ready at ${baseUrl}`);

    const browser = await chromium.launch({ headless: true });
    try {
      const context = await browser.newContext({ serviceWorkers: "block" });
      const page = await context.newPage();

      console.log("[smoke] Checking live API and map");
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
      await page.waitForFunction(() => document.querySelectorAll(".place-marker").length >= 10, undefined, {
        timeout: 20_000,
      });
      await page.getByLabel("Toggle filters").click();
      await page.getByRole("button", { name: /Pub/ }).click();
      await page.getByText("14 places").waitFor({ timeout: 10_000 });

      console.log("[smoke] Checking visible API failure path");
      const errorPage = await context.newPage();
      await errorPage.route("**/api/places", (route) =>
        route.fulfill({ status: 500, contentType: "application/json", body: '{"error":"forced"}' }),
      );
      await errorPage.goto(baseUrl, { waitUntil: "domcontentloaded" });
      await errorPage.getByText("Unable to load places from the database").waitFor({ timeout: 10_000 });
      const markerCount = await errorPage.locator(".place-marker").count();
      if (markerCount !== 0) {
        throw new Error(`Expected no markers after API failure, saw ${markerCount}`);
      }
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
}).finally(() => {
  clearTimeout(smokeTimeout);
});
