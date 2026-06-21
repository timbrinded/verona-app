import { asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  placeDetails,
  placeLinks,
  placeMedia,
  places,
  placeSources,
  type PlaceDetailRow,
  type PlaceLinkRow,
  type PlaceMediaRow,
  type PlaceRow,
  type PlaceSourceRow,
} from "@/db/schema";
import type { Place, PlaceDetails, PlaceLink, PlaceMedia, PlaceSource } from "./place-types";

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function stringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] =>
        typeof entry[0] === "string" &&
        typeof entry[1] === "string" &&
        entry[0].length > 0 &&
        entry[1].length > 0,
    ),
  );
}

function detailsFromRow(row: PlaceDetailRow | null): PlaceDetails {
  if (!row) {
    return {
      openingHours: [],
      bestTimeToVisit: "",
      reservationGuidance: "",
      dietaryTags: [],
      accessibilityNotes: "",
      paymentNotes: "",
      photoUrls: [],
      menuHighlights: "",
      visitTips: "",
      bookingNotes: "",
      socialLinks: {},
      updatedAt: null,
    };
  }

  return {
    openingHours: stringArray(row.openingHours),
    bestTimeToVisit: row.bestTimeToVisit,
    reservationGuidance: row.reservationGuidance,
    dietaryTags: stringArray(row.dietaryTags),
    accessibilityNotes: row.accessibilityNotes,
    paymentNotes: row.paymentNotes,
    photoUrls: stringArray(row.photoUrls),
    menuHighlights: row.menuHighlights,
    visitTips: row.visitTips,
    bookingNotes: row.bookingNotes,
    socialLinks: stringRecord(row.socialLinks),
    updatedAt: row.updatedAt,
  };
}

function publicLink(row: PlaceLinkRow): PlaceLink {
  return {
    type: row.type,
    label: row.label,
    url: row.url,
    source: row.source,
    confidence: row.confidence,
    retrievedAt: row.retrievedAt,
  };
}

function publicSource(row: PlaceSourceRow): PlaceSource {
  return {
    fieldName: row.fieldName,
    sourceUrl: row.sourceUrl,
    sourceTitle: row.sourceTitle,
    excerpt: row.excerpt,
    confidence: row.confidence,
    retrievedAt: row.retrievedAt,
  };
}

function publicMedia(row: PlaceMediaRow): PlaceMedia {
  return {
    url: row.url,
    sourceUrl: row.sourceUrl,
    sourceType: row.sourceType,
    kind: row.kind,
    caption: row.caption,
    attribution: row.attribution,
    width: row.width,
    height: row.height,
    qualityScore: row.qualityScore,
    approved: row.approved === 1,
    rejectedReason: row.rejectedReason,
    retrievedAt: row.retrievedAt,
  };
}

function publicPlace(
  row: PlaceRow,
  details: PlaceDetailRow | null,
  links: PlaceLinkRow[],
  sources: PlaceSourceRow[],
  media: PlaceMediaRow[],
): Place {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    rating: row.rating,
    reviews: row.reviews,
    price: row.price,
    distance: row.distance,
    vibe: row.vibe,
    confidence: row.confidence,
    address: row.address,
    phone: row.phone,
    website: row.website,
    googleMaps: row.googleMaps,
    booking: row.booking,
    notes: row.notes,
    description: row.description,
    lat: row.lat ?? undefined,
    lng: row.lng ?? undefined,
    isHomeBase: row.isHomeBase === 1,
    status: row.status,
    links: links.map(publicLink),
    details: detailsFromRow(details),
    sources: sources.map(publicSource),
    media: media.map(publicMedia),
    dataQuality: row.dataQuality,
    lastEnrichedAt: row.lastEnrichedAt,
    updatedAt: row.updatedAt,
  };
}

export async function listPlaces(): Promise<Place[]> {
  const rows = await db
    .select({
      place: places,
      details: placeDetails,
    })
    .from(places)
    .leftJoin(placeDetails, eq(placeDetails.placeId, places.id))
    .where(eq(places.status, "active"))
    .orderBy(desc(places.isHomeBase), asc(places.category), asc(places.name));

  const ids = rows.map((row) => row.place.id);
  const linkRows = ids.length
    ? await db.select().from(placeLinks).where(inArray(placeLinks.placeId, ids)).orderBy(asc(placeLinks.type))
    : [];
  const sourceRows = ids.length
    ? await db.select().from(placeSources).where(inArray(placeSources.placeId, ids)).orderBy(asc(placeSources.fieldName))
    : [];
  const mediaRows = ids.length
    ? await db
        .select()
        .from(placeMedia)
        .where(inArray(placeMedia.placeId, ids))
        .orderBy(asc(placeMedia.placeId), desc(placeMedia.qualityScore))
    : [];

  const linksByPlace = new Map<string, PlaceLinkRow[]>();
  for (const link of linkRows) {
    linksByPlace.set(link.placeId, [...(linksByPlace.get(link.placeId) ?? []), link]);
  }

  const sourcesByPlace = new Map<string, PlaceSourceRow[]>();
  for (const source of sourceRows) {
    sourcesByPlace.set(source.placeId, [...(sourcesByPlace.get(source.placeId) ?? []), source]);
  }

  const mediaByPlace = new Map<string, PlaceMediaRow[]>();
  for (const media of mediaRows) {
    if (media.approved !== 1) continue;
    mediaByPlace.set(media.placeId, [...(mediaByPlace.get(media.placeId) ?? []), media]);
  }

  return rows.map((row) =>
    publicPlace(
      row.place,
      row.details,
      linksByPlace.get(row.place.id) ?? [],
      sourcesByPlace.get(row.place.id) ?? [],
      mediaByPlace.get(row.place.id) ?? [],
    ),
  );
}
