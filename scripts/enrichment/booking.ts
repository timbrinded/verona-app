export interface BookingValidation {
  originalUrl: string;
  url: string;
  valid: boolean;
  reason: string;
}

export interface BookingUpdate {
  shouldUpdate: boolean;
  url: string;
  note: string;
  reason: string;
}

const DIRECT_THEFORK_PATHS = ["/ristorante/", "/restaurant/"];
const DIRECT_AUTORESERVE_PATHS = ["/restaurants/"];
const DIRECT_TICKET_HOSTS = [
  "getyourguide.",
  "tiqets.",
  "musement.",
  "ticketone.",
  "vivaticket.",
  "coopculture.",
];

function parsedUrl(value: string): URL | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

function normalizedUrl(url: URL): string {
  url.hash = "";
  return url.toString();
}

function hostIncludes(url: URL, needle: string): boolean {
  return url.hostname.toLowerCase().includes(needle);
}

export function isGenericBookingUrl(value: string): boolean {
  const url = parsedUrl(value);
  if (!url) return false;

  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase().replace(/\/+$/, "") || "/";

  if (host.includes("thefork.") && (path === "/search" || path === "/search/")) return true;
  if (host.includes("thefork.") && url.searchParams.has("q") && !DIRECT_THEFORK_PATHS.some((part) => path.includes(part))) {
    return true;
  }
  if ((host.includes("google.") || host.includes("bing.")) && path.includes("search")) return true;

  return false;
}

export function validateBookingUrl(value: string): BookingValidation {
  const originalUrl = value.trim();
  if (!originalUrl) {
    return { originalUrl, url: "", valid: false, reason: "empty" };
  }

  const url = parsedUrl(originalUrl);
  if (!url) {
    return { originalUrl, url: "", valid: false, reason: "invalid_url" };
  }

  const path = url.pathname.toLowerCase();
  const normalized = normalizedUrl(url);
  if (isGenericBookingUrl(normalized)) {
    return { originalUrl, url: "", valid: false, reason: "generic_search" };
  }

  if (hostIncludes(url, "airbnb.") && path.includes("/rooms/")) {
    return { originalUrl, url: normalized, valid: true, reason: "airbnb_room" };
  }

  if (hostIncludes(url, "thefork.")) {
    const isDirect = DIRECT_THEFORK_PATHS.some((part) => path.includes(part)) || /-r\d+/.test(path);
    return {
      originalUrl,
      url: isDirect ? normalized : "",
      valid: isDirect,
      reason: isDirect ? "thefork_direct" : "thefork_not_direct",
    };
  }

  if (hostIncludes(url, "autoreserve.")) {
    const isDirect = DIRECT_AUTORESERVE_PATHS.some((part) => path.includes(part));
    return {
      originalUrl,
      url: isDirect ? normalized : "",
      valid: isDirect,
      reason: isDirect ? "autoreserve_direct" : "autoreserve_not_direct",
    };
  }

  if (DIRECT_TICKET_HOSTS.some((hostPart) => hostIncludes(url, hostPart))) {
    return { originalUrl, url: normalized, valid: path.length > 1, reason: "ticket_page" };
  }

  if (path === "/" || path === "") {
    return { originalUrl, url: "", valid: false, reason: "not_direct" };
  }

  return { originalUrl, url: normalized, valid: true, reason: "direct_page" };
}

export function resolveBookingUpdate(
  candidateBookingUrl: string,
  existingBookingUrl: string,
  candidateBookingNotes: string,
): BookingUpdate {
  const candidate = validateBookingUrl(candidateBookingUrl);
  if (candidate.valid) {
    return {
      shouldUpdate: true,
      url: candidate.url,
      note: candidateBookingNotes,
      reason: candidate.reason,
    };
  }

  if (candidate.originalUrl) {
    return {
      shouldUpdate: true,
      url: "",
      note: candidateBookingNotes || `Rejected booking link: ${candidate.reason}.`,
      reason: candidate.reason,
    };
  }

  const existing = validateBookingUrl(existingBookingUrl);
  if (existingBookingUrl && !existing.valid) {
    return {
      shouldUpdate: true,
      url: "",
      note: candidateBookingNotes || "No direct booking link verified; previous non-direct booking link cleared.",
      reason: existing.reason,
    };
  }

  return {
    shouldUpdate: false,
    url: "",
    note: candidateBookingNotes,
    reason: candidate.reason,
  };
}
