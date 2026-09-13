CREATE TABLE "comparison_optins" (
	"user_id" text PRIMARY KEY NOT NULL,
	"enabled" integer DEFAULT 0 NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_metrics" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "daily_metrics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"source" text NOT NULL,
	"category" text NOT NULL,
	"metric_name" text NOT NULL,
	"value" integer NOT NULL,
	"unit" text NOT NULL,
	"provenance" text NOT NULL,
	"competitive_eligible" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "devices" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"collector_version" text NOT NULL,
	"device_code_hash" text NOT NULL,
	"user_code_hash" text NOT NULL,
	"device_token_hash" text,
	"pending_token_ciphertext" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"token_delivered" integer DEFAULT 0 NOT NULL,
	"expires_at" text NOT NULL,
	"last_seen_at" text,
	"created_at" text NOT NULL,
	CONSTRAINT "devices_device_code_hash_unique" UNIQUE("device_code_hash"),
	CONSTRAINT "devices_user_code_hash_unique" UNIQUE("user_code_hash"),
	CONSTRAINT "devices_device_token_hash_unique" UNIQUE("device_token_hash")
);
--> statement-breakpoint
CREATE TABLE "github_storage" (
	"user_id" text PRIMARY KEY NOT NULL,
	"repo_ciphertext" text,
	"scopes" text DEFAULT '' NOT NULL,
	"configured_at" text
);
--> statement-breakpoint
CREATE TABLE "mcp_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"tool_name" text NOT NULL,
	"observed_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"device_id" text NOT NULL,
	"generated_at" text NOT NULL,
	"collector_version" text NOT NULL,
	"received_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_codes" (
	"code_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"client_id" text NOT NULL,
	"redirect_uri" text NOT NULL,
	"code_challenge" text NOT NULL,
	"scope" text NOT NULL,
	"expires_at" text NOT NULL,
	"used_at" text
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"scope" text NOT NULL,
	"expires_at" text NOT NULL,
	"revoked_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_stories" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"tags_json" text DEFAULT '[]' NOT NULL,
	"visibility" text DEFAULT 'unlisted' NOT NULL,
	"expires_at" text,
	"revoked_at" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "source_coverage" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "source_coverage_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"coverage_start" text NOT NULL,
	"coverage_end" text NOT NULL,
	"last_synced_at" text NOT NULL,
	"completeness" text NOT NULL,
	"competitive_eligible" integer NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"github_id" text NOT NULL,
	"github_login" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text NOT NULL,
	"github_token_ciphertext" text,
	"public_enabled" integer DEFAULT 0 NOT NULL,
	"leaderboard_enabled" integer DEFAULT 0 NOT NULL,
	"conversation_enabled" integer DEFAULT 0 NOT NULL,
	"storage_mode" text DEFAULT 'managed' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "users_github_id_unique" UNIQUE("github_id"),
	CONSTRAINT "users_github_login_unique" UNIQUE("github_login")
);
--> statement-breakpoint
ALTER TABLE "comparison_optins" ADD CONSTRAINT "comparison_optins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_metrics" ADD CONSTRAINT "daily_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "devices" ADD CONSTRAINT "devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_storage" ADD CONSTRAINT "github_storage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mcp_events" ADD CONSTRAINT "mcp_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_batches" ADD CONSTRAINT "metric_batches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_batches" ADD CONSTRAINT "metric_batches_device_id_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."devices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_codes" ADD CONSTRAINT "oauth_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_stories" ADD CONSTRAINT "session_stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_coverage" ADD CONSTRAINT "source_coverage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_daily_metrics_unique" ON "daily_metrics" USING btree ("user_id","date","source","metric_name","provenance");--> statement-breakpoint
CREATE INDEX "idx_daily_metrics_user_date" ON "daily_metrics" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_daily_metrics_leaderboard" ON "daily_metrics" USING btree ("competitive_eligible","date","source");--> statement-breakpoint
CREATE INDEX "idx_devices_user_id" ON "devices" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_devices_status_expires" ON "devices" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "idx_mcp_events_user_observed" ON "mcp_events" USING btree ("user_id","observed_at");--> statement-breakpoint
CREATE INDEX "idx_metric_batches_user_received" ON "metric_batches" USING btree ("user_id","received_at");--> statement-breakpoint
CREATE INDEX "idx_oauth_tokens_user" ON "oauth_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_session_stories_user_created" ON "session_stories" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_source_coverage_user_source" ON "source_coverage" USING btree ("user_id","source");