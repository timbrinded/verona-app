CREATE TABLE `place_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`place_id` text NOT NULL,
	`url` text NOT NULL,
	`source_url` text DEFAULT '' NOT NULL,
	`source_type` text DEFAULT 'unknown' NOT NULL,
	`kind` text DEFAULT 'unknown' NOT NULL,
	`caption` text DEFAULT '' NOT NULL,
	`attribution` text DEFAULT '' NOT NULL,
	`width` integer DEFAULT 0 NOT NULL,
	`height` integer DEFAULT 0 NOT NULL,
	`quality_score` real DEFAULT 0 NOT NULL,
	`approved` integer DEFAULT 0 NOT NULL,
	`rejected_reason` text DEFAULT '' NOT NULL,
	`retrieved_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`place_id`) REFERENCES `places`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `place_media_place_idx` ON `place_media` (`place_id`);--> statement-breakpoint
CREATE INDEX `place_media_approved_idx` ON `place_media` (`approved`);--> statement-breakpoint
CREATE UNIQUE INDEX `place_media_place_url_unique` ON `place_media` (`place_id`,`url`);