CREATE TYPE "public"."access_actor_type" AS ENUM('staff', 'data_principal', 'system');--> statement-breakpoint
CREATE TABLE "access_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_type" "access_actor_type" NOT NULL,
	"actor_id" uuid,
	"actor_email" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"subject_email" text,
	"row_count" integer,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "access_logs_actor_idx" ON "access_logs" USING btree ("actor_id","created_at");--> statement-breakpoint
CREATE INDEX "access_logs_subject_idx" ON "access_logs" USING btree ("subject_email");--> statement-breakpoint
CREATE INDEX "access_logs_created_idx" ON "access_logs" USING btree ("created_at");