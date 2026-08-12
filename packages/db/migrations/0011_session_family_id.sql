ALTER TABLE "sessions" ADD COLUMN "family_id" uuid;--> statement-breakpoint
UPDATE "sessions" SET "family_id" = "id" WHERE "family_id" IS NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "family_id" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "sessions_family_idx" ON "sessions" USING btree ("family_id");
