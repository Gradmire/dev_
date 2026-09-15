CREATE INDEX "applications_assigned_idx" ON "applications" USING btree ("assigned_staff_id");--> statement-breakpoint
CREATE INDEX "applications_updated_idx" ON "applications" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "consent_records_created_idx" ON "consent_records" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "correction_requests_status_created_idx" ON "correction_requests" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "data_export_requests_created_idx" ON "data_export_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "deletion_requests_created_idx" ON "deletion_requests" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "grievances_created_idx" ON "grievances" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");--> statement-breakpoint
CREATE INDEX "leads_updated_idx" ON "leads" USING btree ("updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "newsletter_unsubscribe_token_idx" ON "newsletter_subscribers" USING btree ("unsubscribe_token");--> statement-breakpoint
CREATE INDEX "parental_consent_created_idx" ON "parental_consent_requests" USING btree ("created_at");