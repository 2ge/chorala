ALTER TABLE "posts" ADD COLUMN "app_version" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "context" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "posts_app_version_idx" ON "posts" USING btree ("project_id","app_version");