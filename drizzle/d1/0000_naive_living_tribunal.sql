CREATE TABLE `p_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`type` text DEFAULT 'oauth' NOT NULL,
	`provider` text NOT NULL,
	`provider_account_id` text NOT NULL,
	`refresh_token` text,
	`access_token` text,
	`expires_at` integer,
	`token_type` text,
	`scope` text,
	`id_token` text,
	`session_state` text,
	FOREIGN KEY (`user_id`) REFERENCES `p_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `p_accounts_provider_provider_account_id_key` ON `p_accounts` (`provider`,`provider_account_id`);--> statement-breakpoint
CREATE TABLE `p_prompts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`prompt` text DEFAULT '' NOT NULL,
	`template_id` text,
	`model` text DEFAULT 'GPT Image 2' NOT NULL,
	`category` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`source_url` text,
	`author_handle` text,
	`images` text DEFAULT '[]' NOT NULL,
	`status` text DEFAULT 'approved' NOT NULL,
	`submitted_by` text,
	`visibility` text DEFAULT 'public' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "p_prompts_status_chk" CHECK("p_prompts"."status" IN ('pending', 'approved', 'rejected')),
	CONSTRAINT "p_prompts_visibility_chk" CHECK("p_prompts"."visibility" IN ('draft', 'private', 'public'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `p_prompts_slug_unique` ON `p_prompts` (`slug`);--> statement-breakpoint
CREATE TABLE `p_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text,
	`email` text NOT NULL,
	`email_verified` integer,
	`image` text,
	`password_hash` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_active_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `p_users_email_unique` ON `p_users` (`email`);--> statement-breakpoint
CREATE TABLE `p_verification_tokens` (
	`identifier` text NOT NULL,
	`token` text NOT NULL,
	`expires` integer NOT NULL,
	PRIMARY KEY(`identifier`, `token`)
);
