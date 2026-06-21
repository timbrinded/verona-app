export type MediaSourceType = "official_site" | "wikimedia" | "trusted_listing" | "direct_image" | "unknown";

export interface ImageDimensions {
  width: number;
  height: number;
  type: "jpeg" | "png" | "webp";
}

export interface MediaAssessmentInput {
  url: string;
  sourceUrl: string;
  sourceType: MediaSourceType;
  placeName: string;
  category: string;
  context?: string;
  width: number;
  height: number;
  contentType?: string;
}

export interface MediaAssessment {
  approved: boolean;
  qualityScore: number;
  rejectedReason: string;
  kind: string;
  caption: string;
  attribution: string;
}

const BLOCKED_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
const DECORATIVE_PATTERN =
  /(?:^|[-_/?.=&+])(logo|favicon|icon|sprite|badge|avatar|profile|placeholders?|blank|pixel|loader|share|marker|pin|apple-touch|manifest|qr|delivery|deliveroo|glovo|justeat|uber|tripadvisor-badge|sticker|sponsor|sponsorship|banner|promo|advert|ad)(?:[-_/?.=&+]|$)/i;
const DECORATIVE_FILENAME_PATTERN = /(?:^|\/)[^/?#\s]*(?:logo|placeholder)[^/?#\s]*\.(?:jpe?g|png|webp)(?:[?#\s]|$)/i;
const SOCIAL_HOST_PATTERN = /(?:^|\.)((cdn)?instagram|facebook|fbcdn|tiktok|twimg|x)\./i;
const LINK_HUB_HOST_PATTERN = /(?:^|\.)(linktr\.ee|beacons\.ai|bio\.site|taplink\.cc|campsite\.bio|msha\.ke|linkin\.bio)$/i;
const IMAGE_EXTENSION_PATTERN = /\.(?:jpe?g|png|webp)(?:[?#]|$)/i;

export function cleanHttpUrl(value: unknown): string {
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

export function safeHttpUrl(value: string): URL | null {
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

export function isLikelyImageUrl(value: string): boolean {
  const url = safeHttpUrl(value);
  if (!url) return false;
  return IMAGE_EXTENSION_PATTERN.test(url.pathname);
}

export function hostLabel(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "photo source";
  }
}

export function htmlDecode(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function absoluteHttpUrl(value: string, baseUrl: string): string {
  try {
    const url = new URL(htmlDecode(value), baseUrl);
    return safeHttpUrl(url.toString())?.toString() ?? "";
  } catch {
    return "";
  }
}

function registrableDomain(hostname: string): string {
  const parts = hostname.toLowerCase().replace(/^www\./, "").split(".").filter(Boolean);
  if (parts.length <= 2) return parts.join(".");
  const lastTwo = parts.slice(-2).join(".");
  const lastThree = parts.slice(-3).join(".");
  return /^(co|com|org|net|ac|gov)\.[a-z]{2}$/i.test(lastTwo) ? lastThree : lastTwo;
}

export function isSameSite(candidateUrl: string, referenceUrl: string): boolean {
  const candidate = safeHttpUrl(candidateUrl);
  const reference = safeHttpUrl(referenceUrl);
  if (!candidate || !reference) return false;
  return registrableDomain(candidate.hostname) === registrableDomain(reference.hostname);
}

export function isSocialUrl(value: string): boolean {
  const url = safeHttpUrl(value);
  if (!url) return false;
  return SOCIAL_HOST_PATTERN.test(`${url.hostname}.`);
}

export function isLinkHubUrl(value: string): boolean {
  const url = safeHttpUrl(value);
  if (!url) return false;
  return LINK_HUB_HOST_PATTERN.test(url.hostname.toLowerCase());
}

export function isDecorativeAsset(value: string): boolean {
  const lower = value.toLowerCase();
  return (
    DECORATIVE_PATTERN.test(lower) ||
    DECORATIVE_FILENAME_PATTERN.test(lower) ||
    /(?:maps\.gstatic|ssl\.gstatic|static\.cdninstagram|connect\.facebook|assets\.production\.linktr\.ee)\./i.test(lower)
  );
}

export function sourceTypeForUrl(url: string, placeWebsite = ""): MediaSourceType {
  const parsed = safeHttpUrl(url);
  if (!parsed) return "unknown";
  const host = parsed.hostname.toLowerCase();

  if (isLinkHubUrl(url)) return "unknown";
  if (isLikelyImageUrl(url)) return "direct_image";
  if (host.includes("wikimedia.") || host.includes("wikipedia.")) return "wikimedia";
  if (placeWebsite && isSameSite(url, placeWebsite)) return "official_site";
  if (
    /(?:^|\.)((michelin|gamberorosso|thefork|veronissima|museiverona|comune\.verona|fondazionearena|arenadiverona|turismo\.comune\.verona))\./i.test(
      host,
    )
  ) {
    return "trusted_listing";
  }

  return "unknown";
}

export function isEligibleMediaSource(url: string, placeWebsite = ""): boolean {
  const parsed = safeHttpUrl(url);
  if (!parsed) return false;
  if (isSocialUrl(url)) return false;
  if (isLinkHubUrl(url)) return false;
  if (isDecorativeAsset(url)) return false;
  if (isLikelyImageUrl(url)) return true;
  return sourceTypeForUrl(url, placeWebsite) !== "unknown";
}

function placeTokens(placeName: string): string[] {
  return placeName
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4)
    .slice(0, 5);
}

function categoryKeywords(category: string): string[] {
  const normalized = category.toLowerCase();
  if (/(gelato|ice cream)/.test(normalized)) return ["gelato", "ice", "cream", "dessert", "cono", "sorbet"];
  if (/(wine|aperitivo)/.test(normalized)) return ["wine", "vino", "bar", "aperitivo", "bottle", "glass", "cantina"];
  if (/(cocktail|pub|beer)/.test(normalized)) return ["cocktail", "drink", "bar", "beer", "birra", "pub", "tap"];
  if (/(sights|viewpoint)/.test(normalized)) return ["arena", "church", "basilica", "castel", "bridge", "view", "museum", "piazza", "verona"];
  return ["restaurant", "ristorante", "trattoria", "osteria", "dining", "dish", "food", "cucina", "plate", "pasta"];
}

export function inferMediaKind(input: { url: string; category: string; context?: string }): string {
  const haystack = `${input.url} ${input.context ?? ""}`.toLowerCase();
  if (/(gelato|dessert|sweet|dolce|sorbet|cono|ice-cream)/.test(haystack)) return "dessert";
  if (/(cocktail|drink|wine|vino|beer|birra|bottle|glass)/.test(haystack)) return "drink";
  if (/(dish|food|plate|pasta|pizza|cucina|menu)/.test(haystack)) return "food";
  if (/(interior|inside|sala|room|table|dining)/.test(haystack)) return "interior";
  if (/(exterior|facade|outside|entrance)/.test(haystack)) return "exterior";
  if (/(arena|church|basilica|castel|bridge|museum|view|piazza)/.test(haystack)) return "landmark";
  if (/(sights|viewpoint)/i.test(input.category)) return "landmark";
  return "atmosphere";
}

function positiveMatches(haystack: string, needles: string[]): number {
  return needles.reduce((count, needle) => count + (haystack.includes(needle.toLowerCase()) ? 1 : 0), 0);
}

function captionFor(kind: string, sourceType: MediaSourceType): string {
  const source = sourceType === "wikimedia" ? "Wikimedia" : sourceType === "official_site" ? "Official" : "Verified";
  if (kind === "landmark") return `${source} landmark photo`;
  if (kind === "dessert") return `${source} dessert photo`;
  if (kind === "drink") return `${source} drinks photo`;
  if (kind === "food") return `${source} food photo`;
  if (kind === "interior") return `${source} interior photo`;
  if (kind === "exterior") return `${source} exterior photo`;
  return `${source} place photo`;
}

export function assessMediaCandidate(input: MediaAssessmentInput): MediaAssessment {
  const url = safeHttpUrl(input.url);
  const sourceUrl = safeHttpUrl(input.sourceUrl);
  const contentType = input.contentType?.toLowerCase() ?? "";
  const haystack = `${input.url} ${input.sourceUrl} ${input.context ?? ""}`.toLowerCase();
  const ratio = input.height > 0 ? input.width / input.height : 0;
  const kind = inferMediaKind(input);

  if (!url || !sourceUrl) {
    return { approved: false, qualityScore: 0, rejectedReason: "unsafe URL", kind, caption: "", attribution: "" };
  }
  if (isSocialUrl(input.url) || isSocialUrl(input.sourceUrl)) {
    return { approved: false, qualityScore: 0, rejectedReason: "social media image source", kind, caption: "", attribution: "" };
  }
  if (isDecorativeAsset(haystack)) {
    return { approved: false, qualityScore: 0, rejectedReason: "decorative or brand asset", kind, caption: "", attribution: "" };
  }
  if (contentType && !contentType.includes("image/") && !isLikelyImageUrl(input.url)) {
    return { approved: false, qualityScore: 0, rejectedReason: "not an image response", kind, caption: "", attribution: "" };
  }
  if (input.width < 520 || input.height < 320) {
    return { approved: false, qualityScore: 0, rejectedReason: "image is too small", kind, caption: "", attribution: "" };
  }
  if (ratio < 0.68 || ratio > 2.45) {
    return { approved: false, qualityScore: 0, rejectedReason: "image aspect ratio is unsuitable", kind, caption: "", attribution: "" };
  }

  let qualityScore = 0;
  qualityScore += input.width >= 900 && input.height >= 520 ? 4 : 3;
  if (input.sourceType === "official_site") qualityScore += 7;
  if (input.sourceType === "wikimedia") qualityScore += 7;
  if (input.sourceType === "trusted_listing") qualityScore += 4;
  if (input.sourceType === "direct_image") qualityScore += 4;
  if (/(wp-content|uploads|gallery|galleria|photo|foto|media|images|img|hero)/.test(haystack)) qualityScore += 3;
  if (positiveMatches(haystack, categoryKeywords(input.category)) > 0) qualityScore += 3;
  if (positiveMatches(haystack, placeTokens(input.placeName)) > 0) qualityScore += 2;
  if (/(thumbnail|thumb|small|150x150|300x300)/.test(haystack)) qualityScore -= 4;

  if (qualityScore < 10) {
    return {
      approved: false,
      qualityScore,
      rejectedReason: "low representative score",
      kind,
      caption: "",
      attribution: hostLabel(input.sourceUrl),
    };
  }

  return {
    approved: true,
    qualityScore,
    rejectedReason: "",
    kind,
    caption: captionFor(kind, input.sourceType),
    attribution: hostLabel(input.sourceUrl),
  };
}

function pngDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 24 || buffer.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    type: "png",
  };
}

function jpegDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null;

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }

    const marker = buffer[offset + 1];
    const length = buffer.readUInt16BE(offset + 2);
    if (length < 2) return null;

    if (
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf
    ) {
      if (offset + 8 >= buffer.length) return null;
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
        type: "jpeg",
      };
    }

    offset += 2 + length;
  }

  return null;
}

function readUInt24LE(buffer: Buffer, offset: number): number {
  return buffer[offset] + (buffer[offset + 1] << 8) + (buffer[offset + 2] << 16);
}

function webpDimensions(buffer: Buffer): ImageDimensions | null {
  if (buffer.length < 30 || buffer.toString("ascii", 0, 4) !== "RIFF" || buffer.toString("ascii", 8, 12) !== "WEBP") {
    return null;
  }

  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8X" && buffer.length >= 30) {
    return {
      width: readUInt24LE(buffer, 24) + 1,
      height: readUInt24LE(buffer, 27) + 1,
      type: "webp",
    };
  }
  if (chunk === "VP8 " && buffer.length >= 30) {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
      type: "webp",
    };
  }
  if (chunk === "VP8L" && buffer.length >= 25) {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
      type: "webp",
    };
  }

  return null;
}

export function imageDimensionsFromBuffer(buffer: Buffer): ImageDimensions | null {
  return pngDimensions(buffer) ?? jpegDimensions(buffer) ?? webpDimensions(buffer);
}
