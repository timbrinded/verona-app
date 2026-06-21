import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface ResolveRequest {
  urls?: unknown;
}

interface ResolvedImage {
  url: string;
  sourceUrl: string;
  host: string;
}

const MAX_SOURCE_URLS = 8;
const MAX_IMAGES = 12;
const MAX_HTML_BYTES = 900_000;
const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

function cleanUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  const match = value.match(/https?:\/\/[^\s"'<>),]+/i);
  return match?.[0]?.replace(/[),.]+$/, "") ?? "";
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;

  const [a, b] = parts;
  return a === 10 || a === 127 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 169;
}

function safeHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const hostname = url.hostname.toLowerCase();
    if (BLOCKED_HOSTS.has(hostname) || isPrivateIpv4(hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

function hostLabel(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "photo source";
  }
}

function htmlDecode(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function absoluteUrl(value: string, baseUrl: string): string {
  try {
    return new URL(htmlDecode(value), baseUrl).toString();
  } catch {
    return "";
  }
}

function isImageUrl(value: string): boolean {
  const url = safeHttpUrl(value);
  if (!url) return false;
  return /\.(?:avif|gif|jpe?g|png|webp)$/i.test(url.pathname);
}

function isDecorativeAsset(value: string): boolean {
  return /logo|favicon|icon|sprite|badge|delivero|glovo|justeat|placeholder|avatar|apple-touch/i.test(value);
}

function imageScore(value: string): number {
  const lower = value.toLowerCase();
  let score = 0;
  if (/\.(?:jpe?g|png|webp|avif)(?:[?#]|$)/i.test(value)) score += 8;
  if (/og:image|scontent|uploads|media|photo|image|carousel/i.test(value)) score += 5;
  if (isDecorativeAsset(lower)) score -= 100;
  if (/thumbnail|thumb/i.test(lower)) score -= 2;
  return score;
}

function addCandidate(candidates: Set<string>, rawValue: string, baseUrl: string): void {
  const candidate = absoluteUrl(rawValue, baseUrl);
  if (candidate && isImageUrl(candidate) && imageScore(candidate) > 0) {
    candidates.add(candidate);
  }
}

function extractImagesFromHtml(html: string, sourceUrl: string): string[] {
  const candidates = new Set<string>();

  for (const match of html.matchAll(
    /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]+content=["']([^"']+)["'][^>]*>/gi,
  )) {
    addCandidate(candidates, match[1], sourceUrl);
  }

  for (const match of html.matchAll(
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]*>/gi,
  )) {
    addCandidate(candidates, match[1], sourceUrl);
  }

  for (const match of html.matchAll(/<(?:img|source)[^>]+(?:src|data-src|data-lazy-src)=["']([^"']+)["'][^>]*>/gi)) {
    addCandidate(candidates, match[1], sourceUrl);
  }

  for (const match of html.matchAll(/<(?:img|source)[^>]+srcset=["']([^"']+)["'][^>]*>/gi)) {
    for (const item of match[1].split(",")) {
      addCandidate(candidates, item.trim().split(/\s+/)[0] ?? "", sourceUrl);
    }
  }

  return [...candidates].sort((a, b) => imageScore(b) - imageScore(a));
}

async function fetchHtml(sourceUrl: string): Promise<string> {
  const response = await fetch(sourceUrl, {
    headers: {
      "user-agent": "Mozilla/5.0 (compatible; VeronaGuide/1.0; +https://verona-app-eight.vercel.app)",
      accept: "text/html,application/xhtml+xml",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
  });

  const contentType = response.headers.get("content-type") ?? "";
  if (!response.ok || !contentType.includes("text/html")) return "";

  const reader = response.body?.getReader();
  if (!reader) return "";

  const chunks: Uint8Array[] = [];
  let total = 0;
  while (total < MAX_HTML_BYTES) {
    const { value, done } = await reader.read();
    if (done || !value) break;
    total += value.byteLength;
    chunks.push(value);
  }

  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function POST(request: Request) {
  let payload: ResolveRequest;
  try {
    payload = (await request.json()) as ResolveRequest;
  } catch {
    return NextResponse.json({ images: [] });
  }

  const sources = Array.isArray(payload.urls)
    ? payload.urls.map(cleanUrl).filter(Boolean).slice(0, MAX_SOURCE_URLS)
    : [];
  const seenSources = new Set<string>();
  const seenImages = new Set<string>();
  const images: ResolvedImage[] = [];

  for (const source of sources) {
    if (seenSources.has(source)) continue;
    seenSources.add(source);

    const safeSource = safeHttpUrl(source);
    if (!safeSource) continue;

    if (isImageUrl(safeSource.toString()) && imageScore(safeSource.toString()) > 0) {
      images.push({ url: safeSource.toString(), sourceUrl: safeSource.toString(), host: hostLabel(safeSource.toString()) });
      continue;
    }

    try {
      const html = await fetchHtml(safeSource.toString());
      for (const imageUrl of extractImagesFromHtml(html, safeSource.toString())) {
        if (seenImages.has(imageUrl)) continue;
        seenImages.add(imageUrl);
        images.push({ url: imageUrl, sourceUrl: safeSource.toString(), host: hostLabel(safeSource.toString()) });
        if (images.length >= MAX_IMAGES) break;
      }
    } catch {
      // Ignore individual source failures. The card can simply omit photos.
    }

    if (images.length >= MAX_IMAGES) break;
  }

  return NextResponse.json(
    { images },
    {
      headers: {
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    },
  );
}
