import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const places = sqliteTable(
  "places",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    sourceCategory: text("source_category").notNull().default(""),
    rating: real("rating").notNull().default(0),
    reviews: integer("reviews").notNull().default(0),
    price: text("price").notNull().default(""),
    distance: real("distance").notNull().default(0),
    vibe: integer("vibe").notNull().default(0),
    confidence: real("confidence").notNull().default(0),
    address: text("address").notNull().default(""),
    phone: text("phone").notNull().default(""),
    website: text("website").notNull().default(""),
    googleMaps: text("google_maps").notNull().default(""),
    booking: text("booking").notNull().default(""),
    notes: text("notes").notNull().default(""),
    description: text("description").notNull().default(""),
    lat: real("lat"),
    lng: real("lng"),
    isHomeBase: integer("is_home_base").notNull().default(0),
    status: text("status").notNull().default("active"),
    dataQuality: text("data_quality", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    lastEnrichedAt: text("last_enriched_at"),
  },
  (table) => [
    uniqueIndex("places_slug_unique").on(table.slug),
    index("places_category_idx").on(table.category),
    index("places_status_idx").on(table.status),
    index("places_updated_at_idx").on(table.updatedAt),
  ],
);

export const placeLinks = sqliteTable(
  "place_links",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    placeId: text("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    label: text("label").notNull().default(""),
    url: text("url").notNull(),
    source: text("source").notNull().default("manual"),
    confidence: real("confidence").notNull().default(1),
    retrievedAt: text("retrieved_at"),
  },
  (table) => [
    index("place_links_place_idx").on(table.placeId),
    index("place_links_type_idx").on(table.type),
    uniqueIndex("place_links_place_type_url_unique").on(table.placeId, table.type, table.url),
  ],
);

export const placeDetails = sqliteTable("place_details", {
  placeId: text("place_id")
    .primaryKey()
    .references(() => places.id, { onDelete: "cascade" }),
  openingHours: text("opening_hours", { mode: "json" }).$type<string[]>().notNull().default([]),
  bestTimeToVisit: text("best_time_to_visit").notNull().default(""),
  reservationGuidance: text("reservation_guidance").notNull().default(""),
  dietaryTags: text("dietary_tags", { mode: "json" }).$type<string[]>().notNull().default([]),
  accessibilityNotes: text("accessibility_notes").notNull().default(""),
  paymentNotes: text("payment_notes").notNull().default(""),
  photoUrls: text("photo_urls", { mode: "json" }).$type<string[]>().notNull().default([]),
  menuHighlights: text("menu_highlights").notNull().default(""),
  visitTips: text("visit_tips").notNull().default(""),
  bookingNotes: text("booking_notes").notNull().default(""),
  socialLinks: text("social_links", { mode: "json" }).$type<Record<string, string>>().notNull().default({}),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const placeSources = sqliteTable(
  "place_sources",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    placeId: text("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    fieldName: text("field_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceTitle: text("source_title").notNull().default(""),
    excerpt: text("excerpt").notNull().default(""),
    confidence: real("confidence").notNull().default(0),
    retrievedAt: text("retrieved_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("place_sources_place_idx").on(table.placeId),
    index("place_sources_field_idx").on(table.fieldName),
  ],
);

export const placeMedia = sqliteTable(
  "place_media",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    placeId: text("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    sourceUrl: text("source_url").notNull().default(""),
    sourceType: text("source_type").notNull().default("unknown"),
    kind: text("kind").notNull().default("unknown"),
    caption: text("caption").notNull().default(""),
    attribution: text("attribution").notNull().default(""),
    width: integer("width").notNull().default(0),
    height: integer("height").notNull().default(0),
    qualityScore: real("quality_score").notNull().default(0),
    approved: integer("approved").notNull().default(0),
    rejectedReason: text("rejected_reason").notNull().default(""),
    retrievedAt: text("retrieved_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (table) => [
    index("place_media_place_idx").on(table.placeId),
    index("place_media_approved_idx").on(table.approved),
    uniqueIndex("place_media_place_url_unique").on(table.placeId, table.url),
  ],
);

export const enrichmentRuns = sqliteTable("enrichment_runs", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull().default("parallel"),
  status: text("status").notNull().default("pending"),
  inputPath: text("input_path").notNull().default(""),
  outputPath: text("output_path").notNull().default(""),
  requestedFields: text("requested_fields", { mode: "json" }).$type<string[]>().notNull().default([]),
  startedAt: text("started_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  completedAt: text("completed_at"),
  error: text("error").notNull().default(""),
});

export const enrichmentItems = sqliteTable(
  "enrichment_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    runId: text("run_id")
      .notNull()
      .references(() => enrichmentRuns.id, { onDelete: "cascade" }),
    placeId: text("place_id")
      .notNull()
      .references(() => places.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    inputPayload: text("input_payload", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
    outputPayload: text("output_payload", { mode: "json" }).$type<Record<string, unknown>>().notNull().default({}),
    error: text("error").notNull().default(""),
    importedAt: text("imported_at"),
  },
  (table) => [
    index("enrichment_items_run_idx").on(table.runId),
    index("enrichment_items_place_idx").on(table.placeId),
  ],
);

export type PlaceRow = typeof places.$inferSelect;
export type NewPlaceRow = typeof places.$inferInsert;
export type PlaceLinkRow = typeof placeLinks.$inferSelect;
export type PlaceDetailRow = typeof placeDetails.$inferSelect;
export type PlaceSourceRow = typeof placeSources.$inferSelect;
export type PlaceMediaRow = typeof placeMedia.$inferSelect;
