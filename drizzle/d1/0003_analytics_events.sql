CREATE TABLE `p_analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_name` text NOT NULL,
	`owner_id` text,
	`locale` text NOT NULL,
	`page` text NOT NULL,
	`subject` text NOT NULL,
	`properties_json` text DEFAULT '{}' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "p_analytics_events_name_chk" CHECK("p_analytics_events"."event_name" IN ('Pricing Plan Click'))
);
--> statement-breakpoint
CREATE INDEX `p_analytics_events_created_idx` ON `p_analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `p_analytics_events_name_created_idx` ON `p_analytics_events` (`event_name`,`created_at`);--> statement-breakpoint
CREATE INDEX `p_analytics_events_owner_idx` ON `p_analytics_events` (`owner_id`,`created_at`);
