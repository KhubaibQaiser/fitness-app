-- Backfill outlet_id onto client-scoped tables that previously only had client_id.
-- Rate-limit table for multi-instance login throttling.
-- RLS policies as defense-in-depth (session GUCs: app.org_wide, app.outlet_ids, app.assigned_client_ids).
-- ENABLE without FORCE: table owners (typical Neon/PGlite role) bypass RLS. Application-level
-- scoping is the primary control; FORCE lands when a dedicated non-owner API role exists.

ALTER TABLE "client_goals" ADD COLUMN "outlet_id" uuid;--> statement-breakpoint
UPDATE "client_goals" AS g SET "outlet_id" = c."outlet_id" FROM "clients" AS c WHERE c."id" = g."client_id";--> statement-breakpoint
ALTER TABLE "client_goals" ALTER COLUMN "outlet_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "client_goals" ADD CONSTRAINT "client_goals_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_goals_outlet_idx" ON "client_goals" USING btree ("outlet_id");--> statement-breakpoint

ALTER TABLE "check_ins" ADD COLUMN "outlet_id" uuid;--> statement-breakpoint
UPDATE "check_ins" AS t SET "outlet_id" = c."outlet_id" FROM "clients" AS c WHERE c."id" = t."client_id";--> statement-breakpoint
ALTER TABLE "check_ins" ALTER COLUMN "outlet_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "check_ins_outlet_idx" ON "check_ins" USING btree ("outlet_id");--> statement-breakpoint

ALTER TABLE "coach_notes" ADD COLUMN "outlet_id" uuid;--> statement-breakpoint
UPDATE "coach_notes" AS t SET "outlet_id" = c."outlet_id" FROM "clients" AS c WHERE c."id" = t."client_id";--> statement-breakpoint
ALTER TABLE "coach_notes" ALTER COLUMN "outlet_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "coach_notes_outlet_idx" ON "coach_notes" USING btree ("outlet_id");--> statement-breakpoint

ALTER TABLE "client_dietary_profiles" ADD COLUMN "outlet_id" uuid;--> statement-breakpoint
UPDATE "client_dietary_profiles" AS t SET "outlet_id" = c."outlet_id" FROM "clients" AS c WHERE c."id" = t."client_id";--> statement-breakpoint
ALTER TABLE "client_dietary_profiles" ALTER COLUMN "outlet_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "client_dietary_profiles" ADD CONSTRAINT "client_dietary_profiles_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dietary_profiles_outlet_idx" ON "client_dietary_profiles" USING btree ("outlet_id");--> statement-breakpoint

ALTER TABLE "plan_generations" ADD COLUMN "outlet_id" uuid;--> statement-breakpoint
UPDATE "plan_generations" AS t SET "outlet_id" = c."outlet_id" FROM "clients" AS c WHERE c."id" = t."client_id";--> statement-breakpoint
ALTER TABLE "plan_generations" ALTER COLUMN "outlet_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "plan_generations" ADD CONSTRAINT "plan_generations_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_generations_outlet_idx" ON "plan_generations" USING btree ("outlet_id");--> statement-breakpoint

CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "clients_tenant_isolation" ON "clients"
  USING (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
    OR id::text = ANY (string_to_array(coalesce(current_setting('app.assigned_client_ids', true), ''), ','))
  )
  WITH CHECK (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
  );--> statement-breakpoint

ALTER TABLE "vitals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "vitals_tenant_isolation" ON "vitals"
  USING (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
    OR client_id::text = ANY (string_to_array(coalesce(current_setting('app.assigned_client_ids', true), ''), ','))
  )
  WITH CHECK (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
  );--> statement-breakpoint

ALTER TABLE "meal_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "meal_plans_tenant_isolation" ON "meal_plans"
  USING (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
    OR client_id::text = ANY (string_to_array(coalesce(current_setting('app.assigned_client_ids', true), ''), ','))
  )
  WITH CHECK (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
  );--> statement-breakpoint

ALTER TABLE "check_ins" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "check_ins_tenant_isolation" ON "check_ins"
  USING (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
    OR client_id::text = ANY (string_to_array(coalesce(current_setting('app.assigned_client_ids', true), ''), ','))
  )
  WITH CHECK (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
  );--> statement-breakpoint

ALTER TABLE "client_goals" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "client_goals_tenant_isolation" ON "client_goals"
  USING (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
    OR client_id::text = ANY (string_to_array(coalesce(current_setting('app.assigned_client_ids', true), ''), ','))
  )
  WITH CHECK (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
  );--> statement-breakpoint

ALTER TABLE "coach_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "coach_notes_tenant_isolation" ON "coach_notes"
  USING (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
    OR client_id::text = ANY (string_to_array(coalesce(current_setting('app.assigned_client_ids', true), ''), ','))
  )
  WITH CHECK (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
  );--> statement-breakpoint

ALTER TABLE "client_dietary_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "client_dietary_profiles_tenant_isolation" ON "client_dietary_profiles"
  USING (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
    OR client_id::text = ANY (string_to_array(coalesce(current_setting('app.assigned_client_ids', true), ''), ','))
  )
  WITH CHECK (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
  );--> statement-breakpoint

ALTER TABLE "plan_generations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "plan_generations_tenant_isolation" ON "plan_generations"
  USING (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
    OR client_id::text = ANY (string_to_array(coalesce(current_setting('app.assigned_client_ids', true), ''), ','))
  )
  WITH CHECK (
    current_setting('app.org_wide', true) = 'true'
    OR outlet_id::text = ANY (string_to_array(coalesce(current_setting('app.outlet_ids', true), ''), ','))
  );
