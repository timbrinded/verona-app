import type { Place, PlaceDetails, PlaceLink, PlaceSource } from "./place-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requiredString(record: Record<string, unknown>, key: string, row: number): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Invalid place payload: row ${row} missing ${key}`);
  }
  return value;
}

function optionalString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function optionalNullableString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : null;
}

function optionalNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function optionalCoordinate(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" &&
        entry[0].length > 0 &&
        typeof entry[1] === "string" &&
        entry[1].length > 0,
    ),
  );
}

function normalizeLink(value: unknown): PlaceLink | null {
  if (!isRecord(value)) return null;
  const type = optionalString(value, "type");
  const url = optionalString(value, "url");
  if (!type || !url) return null;

  return {
    type,
    label: optionalString(value, "label"),
    url,
    source: optionalString(value, "source"),
    confidence: optionalNumber(value, "confidence"),
    retrievedAt: optionalNullableString(value, "retrievedAt"),
  };
}

function normalizeSource(value: unknown): PlaceSource | null {
  if (!isRecord(value)) return null;
  const fieldName = optionalString(value, "fieldName");
  const sourceUrl = optionalString(value, "sourceUrl");
  if (!fieldName || !sourceUrl) return null;

  return {
    fieldName,
    sourceUrl,
    sourceTitle: optionalString(value, "sourceTitle"),
    excerpt: optionalString(value, "excerpt"),
    confidence: optionalNumber(value, "confidence"),
    retrievedAt: optionalString(value, "retrievedAt"),
  };
}

function normalizeDetails(value: unknown): PlaceDetails {
  const details = isRecord(value) ? value : {};

  return {
    openingHours: stringArray(details.openingHours),
    bestTimeToVisit: optionalString(details, "bestTimeToVisit"),
    reservationGuidance: optionalString(details, "reservationGuidance"),
    dietaryTags: stringArray(details.dietaryTags),
    accessibilityNotes: optionalString(details, "accessibilityNotes"),
    paymentNotes: optionalString(details, "paymentNotes"),
    photoUrls: stringArray(details.photoUrls),
    menuHighlights: optionalString(details, "menuHighlights"),
    visitTips: optionalString(details, "visitTips"),
    bookingNotes: optionalString(details, "bookingNotes"),
    socialLinks: stringRecord(details.socialLinks),
    updatedAt: optionalNullableString(details, "updatedAt"),
  };
}

function normalizePlace(value: unknown, index: number): Place {
  if (!isRecord(value)) {
    throw new Error(`Invalid place payload: row ${index} is not an object`);
  }

  const dataQuality = isRecord(value.dataQuality) ? value.dataQuality : {};

  return {
    id: requiredString(value, "id", index),
    slug: requiredString(value, "slug", index),
    name: requiredString(value, "name", index),
    category: requiredString(value, "category", index),
    rating: optionalNumber(value, "rating"),
    reviews: Math.trunc(optionalNumber(value, "reviews")),
    price: optionalString(value, "price"),
    distance: optionalNumber(value, "distance"),
    vibe: Math.trunc(optionalNumber(value, "vibe")),
    confidence: optionalNumber(value, "confidence"),
    address: optionalString(value, "address"),
    phone: optionalString(value, "phone"),
    website: optionalString(value, "website"),
    googleMaps: optionalString(value, "googleMaps"),
    booking: optionalString(value, "booking"),
    notes: optionalString(value, "notes"),
    description: optionalString(value, "description"),
    lat: optionalCoordinate(value, "lat"),
    lng: optionalCoordinate(value, "lng"),
    isHomeBase: value.isHomeBase === true || value.isHomeBase === 1,
    status: optionalString(value, "status") || "active",
    links: Array.isArray(value.links) ? value.links.map(normalizeLink).filter((link): link is PlaceLink => link !== null) : [],
    details: normalizeDetails(value.details),
    sources: Array.isArray(value.sources)
      ? value.sources.map(normalizeSource).filter((source): source is PlaceSource => source !== null)
      : [],
    dataQuality,
    lastEnrichedAt: optionalNullableString(value, "lastEnrichedAt"),
    updatedAt: requiredString(value, "updatedAt", index),
  };
}

export function parsePlacesPayload(value: unknown): Place[] {
  if (!Array.isArray(value)) {
    throw new Error("Invalid place payload: expected an array");
  }

  return value.map((place, index) => normalizePlace(place, index + 1));
}
