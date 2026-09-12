CREATE TABLE `daily_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`source` text NOT NULL,
	`category` text NOT NULL,
	`metric_name` text NOT NULL,
	`value` integer NOT NULL,
	`unit` text NOT NULL,
	`provenance` text NOT NULL,
	`competitive_eligible` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_daily_metrics_unique` ON `daily_metrics` (`user_id`,`date`,`source`,`metric_name`,`provenance`);--> statement-breakpoint
CREATE INDEX `idx_daily_metrics_user_date` ON `daily_metrics` (`user_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_daily_metrics_leaderboard` ON `daily_metrics` (`competitive_eligible`,`date`,`source`);--> statement-breakpoint
CREATE TABLE `devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`collector_version` text NOT NULL,
	`device_code_hash` text NOT NULL,
	`user_code_hash` text NOT NULL,
	`device_token_hash` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`token_delivered` integer DEFAULT false NOT NULL,
	`expires_at` text NOT NULL,
	`last_seen_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_device_code_hash_unique` ON `devices` (`device_code_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `devices_user_code_hash_unique` ON `devices` (`user_code_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `devices_device_token_hash_unique` ON `devices` (`device_token_hash`);--> statement-breakpoint
CREATE INDEX `idx_devices_user_id` ON `devices` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_devices_status_expires` ON `devices` (`status`,`expires_at`);--> statement-breakpoint
CREATE TABLE `mcp_events` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`tool_name` text NOT NULL,
	`observed_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_mcp_events_user_observed` ON `mcp_events` (`user_id`,`observed_at`);--> statement-breakpoint
CREATE TABLE `metric_batches` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`device_id` text NOT NULL,
	`generated_at` text NOT NULL,
	`collector_version` text NOT NULL,
	`received_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_metric_batches_user_received` ON `metric_batches` (`user_id`,`received_at`);--> statement-breakpoint
CREATE TABLE `oauth_codes` (
	`code_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`code_challenge` text NOT NULL,
	`scope` text NOT NULL,
	`expires_at` text NOT NULL,
	`used_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `oauth_tokens` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`scope` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_oauth_tokens_user` ON `oauth_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `session_stories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`title` text NOT NULL,
	`summary` text NOT NULL,
	`tags_json` text DEFAULT '[]' NOT NULL,
	`visibility` text DEFAULT 'unlisted' NOT NULL,
	`expires_at` text,
	`revoked_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_session_stories_user_created` ON `session_stories` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `source_coverage` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`source` text NOT NULL,
	`coverage_start` text NOT NULL,
	`coverage_end` text NOT NULL,
	`last_synced_at` text NOT NULL,
	`completeness` text NOT NULL,
	`competitive_eligible` integer NOT NULL,
	`note` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_source_coverage_user_source` ON `source_coverage` (`user_id`,`source`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`github_id` text NOT NULL,
	`github_login` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text NOT NULL,
	`github_token_ciphertext` text,
	`public_enabled` integer DEFAULT false NOT NULL,
	`leaderboard_enabled` integer DEFAULT false NOT NULL,
	`conversation_enabled` integer DEFAULT false NOT NULL,
	`storage_mode` text DEFAULT 'managed' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_id_unique` ON `users` (`github_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_github_login_unique` ON `users` (`github_login`);