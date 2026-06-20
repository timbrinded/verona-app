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
  it("fails visibly on Vercel when database env is absent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    process.env.VERCEL = "1";
    delete process.env.TURSO_DATABASE_URL;
    delete process.env.DATABASE_URL;

    const { GET } = await importRoute();
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("x-places-source")).toBe("sqlite-error");
    expect(body).toEqual({ error: "Failed to load places from SQLite" });
  });

  it("does not serve static data when SQLite fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const dir = await mkdtemp(join(tmpdir(), "verona-route-"));
    process.env.VERCEL = "1";
    process.env.DATABASE_URL = `file:${join(dir, "empty.db")}`;
    delete process.env.TURSO_DATABASE_URL;

    const { GET } = await importRoute();
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get("x-places-source")).toBe("sqlite-error");
    expect(body).toEqual({ error: "Failed to load places from SQLite" });
  });
});
