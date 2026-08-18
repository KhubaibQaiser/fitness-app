ALTER TABLE "client_goals" ADD COLUMN "target_kcal" integer;--> statement-breakpoint
UPDATE "client_goals"
SET "target_kcal" = (("initial_targets" ->> 'kcal')::integer)
WHERE "initial_targets" IS NOT NULL AND "initial_targets" ->> 'kcal' IS NOT NULL;
