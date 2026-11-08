CREATE TABLE `p_credit_accounts` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`purchased_balance` integer DEFAULT 0 NOT NULL,
	`monthly_balance` integer DEFAULT 0 NOT NULL,
	`monthly_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "p_credit_accounts_purchased_chk" CHECK("p_credit_accounts"."purchased_balance" >= 0),
	CONSTRAINT "p_credit_accounts_monthly_chk" CHECK("p_credit_accounts"."monthly_balance" >= 0)
);
--> statement-breakpoint
CREATE TABLE `p_credit_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`amount` integer NOT NULL,
	`kind` text NOT NULL,
	`reference_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`balance_after` integer NOT NULL,
	`pool` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "p_credit_transactions_kind_chk" CHECK("p_credit_transactions"."kind" IN ('purchase', 'signup', 'reserve', 'refund', 'merge')),
	CONSTRAINT "p_credit_transactions_pool_chk" CHECK("p_credit_transactions"."pool" IN ('purchased', 'monthly')),
	CONSTRAINT "p_credit_transactions_amount_chk" CHECK("p_credit_transactions"."amount" != 0),
	CONSTRAINT "p_credit_transactions_balance_chk" CHECK("p_credit_transactions"."balance_after" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `p_credit_transactions_idempotency_idx` ON `p_credit_transactions` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `p_credit_transactions_owner_idx` ON `p_credit_transactions` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `p_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`model` text NOT NULL,
	`credits` integer NOT NULL,
	`monthly_credits` integer DEFAULT 0 NOT NULL,
	`purchased_credits` integer DEFAULT 0 NOT NULL,
	`status` text NOT NULL,
	`images` text DEFAULT '[]' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "p_generations_status_chk" CHECK("p_generations"."status" IN ('reserved', 'succeeded', 'failed')),
	CONSTRAINT "p_generations_credits_chk" CHECK("p_generations"."credits" > 0)
);
--> statement-breakpoint
CREATE INDEX `p_generations_owner_idx` ON `p_generations` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `p_guest_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`guest_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `p_guest_sessions_guest_idx` ON `p_guest_sessions` (`guest_id`);--> statement-breakpoint
CREATE INDEX `p_guest_sessions_expiry_idx` ON `p_guest_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `p_orders` (
	`order_no` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'usd' NOT NULL,
	`product_id` text NOT NULL,
	`product_name` text NOT NULL,
	`credits` integer NOT NULL,
	`status` text DEFAULT 'created' NOT NULL,
	`stripe_session_id` text,
	`stripe_payment_intent_id` text,
	`paid_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "p_orders_status_chk" CHECK("p_orders"."status" IN ('created', 'paid', 'refunded')),
	CONSTRAINT "p_orders_amount_chk" CHECK("p_orders"."amount" > 0),
	CONSTRAINT "p_orders_credits_chk" CHECK("p_orders"."credits" > 0)
);
--> statement-breakpoint
CREATE INDEX `p_orders_owner_idx` ON `p_orders` (`owner_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `p_orders_session_idx` ON `p_orders` (`stripe_session_id`);--> statement-breakpoint
CREATE TABLE `p_stripe_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`processed_at` integer,
	CONSTRAINT "p_stripe_events_status_chk" CHECK("p_stripe_events"."status" IN ('processing', 'processed', 'ignored', 'failed'))
);
--> statement-breakpoint
CREATE TABLE `p_subscriptions` (
	`stripe_subscription_id` text PRIMARY KEY NOT NULL,
	`stripe_customer_id` text NOT NULL,
	`owner_id` text NOT NULL,
	`status` text NOT NULL,
	`current_period_end` integer,
	`latest_granted_period_end` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "p_subscriptions_status_chk" CHECK("p_subscriptions"."status" IN ('incomplete', 'active', 'past_due', 'canceled', 'unpaid'))
);
--> statement-breakpoint
CREATE INDEX `p_subscriptions_owner_idx` ON `p_subscriptions` (`owner_id`,`updated_at`);--> statement-breakpoint
CREATE INDEX `p_subscriptions_customer_idx` ON `p_subscriptions` (`stripe_customer_id`);