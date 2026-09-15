CREATE TYPE "public"."grievance_status" AS ENUM('received', 'in_progress', 'resolved', 'escalated');--> statement-breakpoint
CREATE TYPE "public"."parental_consent_status" AS ENUM('pending', 'verified', 'declined', 'expired');--> statement-breakpoint
CREATE TYPE "public"."rights_request_status" AS ENUM('received', 'in_progress', 'completed', 'rejected');--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_email" text NOT NULL,
	"auth_user_id" uuid,
	"purpose_key" text NOT NULL,
	"granted" boolean NOT NULL,
	"notice_version" text NOT NULL,
	"source" text,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "correction_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_email" text NOT NULL,
	"auth_user_id" uuid,
	"details" text NOT NULL,
	"status" "rights_request_status" DEFAULT 'received' NOT NULL,
	"resolution_note" text,
	"handled_by_staff_id" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "data_export_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_email" text NOT NULL,
	"auth_user_id" uuid,
	"status" "rights_request_status" DEFAULT 'received' NOT NULL,
	"format" text DEFAULT 'json' NOT NULL,
	"fulfilled_at" timestamp with time zone,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deletion_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_email" text NOT NULL,
	"auth_user_id" uuid,
	"status" "rights_request_status" DEFAULT 'received' NOT NULL,
	"reason" text,
	"erased_summary" jsonb,
	"retained_summary" jsonb,
	"completed_at" timestamp with time zone,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grievances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" text NOT NULL,
	"subject_email" text NOT NULL,
	"subject_name" text,
	"category" text NOT NULL,
	"details" text NOT NULL,
	"status" "grievance_status" DEFAULT 'received' NOT NULL,
	"response_due_at" timestamp with time zone NOT NULL,
	"resolution_note" text,
	"handled_by_staff_id" uuid,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "nominations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_email" text NOT NULL,
	"auth_user_id" uuid,
	"nominee_name" text NOT NULL,
	"nominee_email" text NOT NULL,
	"nominee_relationship" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parental_consent_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_email" text NOT NULL,
	"subject_name" text,
	"subject_date_of_birth" date,
	"parent_email" text NOT NULL,
	"parent_name" text,
	"relationship" text,
	"token_hash" text NOT NULL,
	"status" "parental_consent_status" DEFAULT 'pending' NOT NULL,
	"declaration_accepted_at" timestamp with time zone,
	"verified_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "applicants" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD COLUMN "unsubscribe_token" text;--> statement-breakpoint
ALTER TABLE "correction_requests" ADD CONSTRAINT "correction_requests_handled_by_staff_id_staff_id_fk" FOREIGN KEY ("handled_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grievances" ADD CONSTRAINT "grievances_handled_by_staff_id_staff_id_fk" FOREIGN KEY ("handled_by_staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "consent_records_subject_idx" ON "consent_records" USING btree ("subject_email","purpose_key","created_at");--> statement-breakpoint
CREATE INDEX "correction_requests_subject_idx" ON "correction_requests" USING btree ("subject_email");--> statement-breakpoint
CREATE INDEX "correction_requests_status_idx" ON "correction_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "data_export_requests_subject_idx" ON "data_export_requests" USING btree ("subject_email");--> statement-breakpoint
CREATE INDEX "deletion_requests_subject_idx" ON "deletion_requests" USING btree ("subject_email");--> statement-breakpoint
CREATE UNIQUE INDEX "grievances_reference_idx" ON "grievances" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "grievances_subject_idx" ON "grievances" USING btree ("subject_email");--> statement-breakpoint
CREATE INDEX "grievances_status_idx" ON "grievances" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "nominations_subject_idx" ON "nominations" USING btree ("subject_email");--> statement-breakpoint
CREATE UNIQUE INDEX "parental_consent_token_idx" ON "parental_consent_requests" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "parental_consent_subject_idx" ON "parental_consent_requests" USING btree ("subject_email");