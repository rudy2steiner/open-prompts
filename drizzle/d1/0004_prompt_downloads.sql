CREATE TABLE `p_prompt_downloads` (
	`owner_id` text NOT NULL,
	`prompt_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`owner_id`, `prompt_id`)
);
--> statement-breakpoint
CREATE INDEX `p_prompt_downloads_owner_idx` ON `p_prompt_downloads` (`owner_id`,`created_at`);
