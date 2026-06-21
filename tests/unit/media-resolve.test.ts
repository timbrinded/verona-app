import { afterEach, describe, expect, it, vi } from "vitest";

async function importRoute() {
  vi.resetModules();
  return import("../../src/app/api/media/resolve/route");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("/api/media/resolve", () => {
  it("extracts real page images and rejects decorative assets", async () => {
    const html = `
      <html>
        <head>
          <meta property="og:image" content="https://cdn.example.com/photos/dining-room.jpg" />
        </head>
        <body>
          <img src="/wp-content/uploads/logo.png" />
          <img src="/wp-content/uploads/favicon.png" />
          <img src="/wp-content/uploads/gelato-counter.webp" />
        </body>
      </html>
    `;

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } })),
    );

    const { POST } = await importRoute();
    const response = await POST(
      new Request("http://localhost/api/media/resolve", {
        method: "POST",
        body: JSON.stringify({ urls: ["https://example.com/gallery"] }),
      }),
    );
    const body = (await response.json()) as { images: { url: string }[] };

    expect(body.images.map((image) => image.url)).toEqual([
      "https://cdn.example.com/photos/dining-room.jpg",
      "https://example.com/wp-content/uploads/gelato-counter.webp",
    ]);
  });

  it("ignores unsafe source URLs", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { POST } = await importRoute();
    const response = await POST(
      new Request("http://localhost/api/media/resolve", {
        method: "POST",
        body: JSON.stringify({ urls: ["http://127.0.0.1/private", "file:///tmp/photo.jpg"] }),
      }),
    );
    const body = (await response.json()) as { images: unknown[] };

    expect(body.images).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
