import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalEnv = { ...process.env };

async function importRoute() {
  vi.resetModules();
  return import("../../src/app/api/places/route");
}

afterEach(() => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }
  Object.assign(process.env, originalEnv);
  vi.restoreAllMocks();
});

describe("/api/places", () => {
  it("uses static fallback on Vercel when database env is absent", async () => {
    process.env.VERCEL = "1";
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.DATABASE_URL;

    const { GET } = await importRoute();
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-places-source")).toBe("static-fallback");
    expect(body).toHaveLength(54);
  });

  it("falls back to static data when SQLite fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const dir = await mkdtemp(join(tmpdir(), "verona-route-"));
    process.env.VERCEL = "1";
    process.env.DATABASE_URL = `file:${join(dir, "empty.db")}`;
    delete process.env.TURSO_DATABASE_URL;

    const { GET } = await importRoute();
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-places-source")).toBe("static-fallback-after-error");
    expect(body).toHaveLength(54);
  });
});
