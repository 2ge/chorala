CREATE TABLE "companies" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"domain" text,
	"mrr" integer DEFAULT 0 NOT NULL,
	"plan" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "end_users" ADD COLUMN "company_id" text;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "companies_project_external_uq" ON "companies" USING btree ("project_id","external_id") WHERE "companies"."external_id" is not null;--> statement-breakpoint
CREATE INDEX "companies_project_idx" ON "companies" USING btree ("project_id");--> statement-breakpoint
ALTER TABLE "end_users" ADD CONSTRAINT "end_users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "end_users_company_idx" ON "end_users" USING btree ("company_id");