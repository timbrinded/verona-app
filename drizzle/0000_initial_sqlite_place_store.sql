CREATE TABLE IF NOT EXISTS `enrichment_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`run_id` text NOT NULL,
	`place_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`input_payload` text DEFAULT '{}' NOT NULL,
	`output_payload` text DEFAULT '{}' NOT NULL,
	`error` text DEFAULT '' NOT NULL,
	`imported_at` text,
	FOREIGN KEY (`run_id`) REFERENCES `enrichment_runs`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `enrichment_items_run_idx` ON `enrichment_items` (`run_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `enrichment_items_place_idx` ON `enrichment_items` (`place_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `enrichment_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text DEFAULT 'parallel' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`input_path` text DEFAULT '' NOT NULL,
	`output_path` text DEFAULT '' NOT NULL,
	`requested_fields` text DEFAULT '[]' NOT NULL,
	`started_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`completed_at` text,
	`error` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `place_details` (
	`place_id` text PRIMARY KEY NOT NULL,
	`opening_hours` text DEFAULT '[]' NOT NULL,
	`best_time_to_visit` text DEFAULT '' NOT NULL,
	`reservation_guidance` text DEFAULT '' NOT NULL,
	`dietary_tags` text DEFAULT '[]' NOT NULL,
	`accessibility_notes` text DEFAULT '' NOT NULL,
	`payment_notes` text DEFAULT '' NOT NULL,
	`photo_urls` text DEFAULT '[]' NOT NULL,
	`menu_highlights` text DEFAULT '' NOT NULL,
	`visit_tips` text DEFAULT '' NOT NULL,
	`booking_notes` text DEFAULT '' NOT NULL,
	`social_links` text DEFAULT '{}' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `place_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`place_id` text NOT NULL,
	`type` text NOT NULL,
	`label` text DEFAULT '' NOT NULL,
	`url` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`confidence` real DEFAULT 1 NOT NULL,
	`retrieved_at` text,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `place_links_place_idx` ON `place_links` (`place_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `place_links_type_idx` ON `place_links` (`type`);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `place_links_place_type_url_unique` ON `place_links` (`place_id`,`type`,`url`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `place_sources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`place_id` text NOT NULL,
	`field_name` text NOT NULL,
	`source_url` text NOT NULL,
	`source_title` text DEFAULT '' NOT NULL,
	`excerpt` text DEFAULT '' NOT NULL,
	`confidence` real DEFAULT 0 NOT NULL,
	`retrieved_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `place_sources_place_idx` ON `place_sources` (`place_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `place_sources_field_idx` ON `place_sources` (`field_name`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `places` (
	`id` text PRIMARY KEY NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`source_category` text DEFAULT '' NOT NULL,
	`rating` real DEFAULT 0 NOT NULL,
	`reviews` integer DEFAULT 0 NOT NULL,
	`price` text DEFAULT '' NOT NULL,
	`distance` real DEFAULT 0 NOT NULL,
	`vibe` integer DEFAULT 0 NOT NULL,
	`confidence` real DEFAULT 0 NOT NULL,
	`address` text DEFAULT '' NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`website` text DEFAULT '' NOT NULL,
	`google_maps` text DEFAULT '' NOT NULL,
	`booking` text DEFAULT '' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`lat` real,
	`lng` real,
	`is_home_base` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`data_quality` text DEFAULT '{}' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`last_enriched_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `places_slug_unique` ON `places` (`slug`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `places_category_idx` ON `places` (`category`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `places_status_idx` ON `places` (`status`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `places_updated_at_idx` ON `places` (`updated_at`);
