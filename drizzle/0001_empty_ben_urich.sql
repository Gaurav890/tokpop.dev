CREATE TABLE `comparison_optins` (
	`user_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `github_storage` (
	`user_id` text PRIMARY KEY NOT NULL,
	`repo_ciphertext` text,
	`scopes` text DEFAULT '' NOT NULL,
	`configured_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
