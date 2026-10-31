CREATE INDEX `p_accounts_user_id_idx` ON `p_accounts` (`user_id`);--> statement-breakpoint
CREATE INDEX `p_prompts_category_idx` ON `p_prompts` (`category`);--> statement-breakpoint
CREATE INDEX `p_prompts_status_idx` ON `p_prompts` (`status`);--> statement-breakpoint
CREATE INDEX `p_prompts_submitted_by_idx` ON `p_prompts` (`submitted_by`);--> statement-breakpoint
CREATE INDEX `p_prompts_visibility_idx` ON `p_prompts` (`visibility`);--> statement-breakpoint
CREATE INDEX `prompts_model_idx` ON `p_prompts` (`model`);--> statement-breakpoint
CREATE INDEX `prompts_sort_idx` ON `p_prompts` (`sort_order`,`created_at`);--> statement-breakpoint
CREATE INDEX `p_prompts_gallery_created_idx` ON `p_prompts` (`status`,`created_at`,`id`);--> statement-breakpoint
CREATE INDEX `p_users_last_active_at_idx` ON `p_users` (`last_active_at`);