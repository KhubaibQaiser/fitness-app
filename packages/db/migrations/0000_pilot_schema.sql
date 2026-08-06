CREATE TYPE "public"."check_in_status" AS ENUM('DUE', 'COMPLETED', 'SKIPPED');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."coach_tier" AS ENUM('junior', 'senior', 'head');--> statement-breakpoint
CREATE TYPE "public"."feedback_kind" AS ENUM('EDIT', 'SWAP', 'REGENERATE', 'PUBLISH_UNCHANGED', 'ADJUSTMENT_ACCEPTED', 'ADJUSTMENT_MODIFIED', 'ADJUSTMENT_REJECTED');--> statement-breakpoint
CREATE TYPE "public"."food_source" AS ENUM('usda', 'curated', 'tenant');--> statement-breakpoint
CREATE TYPE "public"."generation_kind" AS ENUM('INITIAL', 'ADJUSTMENT', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."generation_status" AS ENUM('QUEUED', 'RUNNING', 'SUCCEEDED', 'RETRIED', 'FELL_BACK', 'REJECTED', 'BLOCKED_REQUIRES_OVERRIDE', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."goal_preset" AS ENUM('LOSE', 'GAIN', 'MAINTAIN', 'RECOMP');--> statement-breakpoint
CREATE TYPE "public"."goal_rate" AS ENUM('CONSERVATIVE', 'STANDARD', 'AGGRESSIVE');--> statement-breakpoint
CREATE TYPE "public"."goal_status" AS ENUM('ACTIVE', 'ACHIEVED', 'ABANDONED', 'SUPERSEDED');--> statement-breakpoint
CREATE TYPE "public"."meal_slot" AS ENUM('breakfast', 'lunch', 'dinner', 'snack');--> statement-breakpoint
CREATE TYPE "public"."notification_priority" AS ENUM('HIGH', 'NORMAL');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('CHECKIN_DUE', 'CHECKIN_OVERDUE', 'OFF_TRACK', 'RED_FLAG', 'PLAN_NEEDS_REVIEW', 'PLAN_PUBLISHED', 'MILESTONE', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "public"."photo_pose" AS ENUM('front', 'side', 'back', 'other');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('DRAFT', 'PUBLISHED', 'SUPERSEDED', 'NEEDS_REVIEW', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."restriction_type" AS ENUM('ALLERGY_SEVERE', 'ALLERGY_MILD', 'INTOLERANCE', 'DISLIKE', 'RELIGIOUS', 'ETHICAL', 'MEDICAL');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('PLATFORM_OPERATOR', 'SUPER_ADMIN', 'ORG_ADMIN', 'OUTLET_ADMIN', 'COACH_MANAGER', 'COACH', 'FRONT_DESK', 'INSTRUCTOR', 'CLIENT', 'GUARDIAN');--> statement-breakpoint
CREATE TYPE "public"."sex" AS ENUM('F', 'M');--> statement-breakpoint
CREATE TYPE "public"."vitals_source" AS ENUM('coach', 'member', 'import');--> statement-breakpoint
CREATE TABLE "check_ins" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"goal_id" uuid NOT NULL,
	"scheduled_for" text NOT NULL,
	"completed_at" timestamp with time zone,
	"vitals_id" uuid,
	"adherence_rating" smallint,
	"coach_notes" text,
	"engine_output" jsonb,
	"status" "check_in_status" DEFAULT 'DUE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_goals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"preset" "goal_preset" NOT NULL,
	"rate" "goal_rate" NOT NULL,
	"start_date" text NOT NULL,
	"start_weight_kg" numeric(5, 2) NOT NULL,
	"target_weight_kg" numeric(5, 2),
	"target_date" text,
	"expected_weekly_delta_kg" numeric(4, 2) NOT NULL,
	"initial_targets" jsonb,
	"tdee_estimate" integer,
	"checkin_weekday" smallint DEFAULT 1 NOT NULL,
	"status" "goal_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "progress_photos" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"taken_at" timestamp with time zone NOT NULL,
	"pose" "photo_pose" DEFAULT 'front' NOT NULL,
	"storage_key" text NOT NULL,
	"consent_recorded_at" timestamp with time zone NOT NULL,
	"uploaded_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vitals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	"recorded_by" uuid NOT NULL,
	"source" "vitals_source" DEFAULT 'coach' NOT NULL,
	"weight_kg" numeric(5, 2),
	"body_fat_pct" numeric(4, 1),
	"muscle_mass_kg" numeric(5, 2),
	"chest_cm" numeric(5, 1),
	"waist_cm" numeric(5, 1),
	"hip_cm" numeric(5, 1),
	"arm_cm" numeric(5, 1),
	"thigh_cm" numeric(5, 1),
	"resting_hr" smallint,
	"bp_systolic" smallint,
	"bp_diastolic" smallint,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_feedback_events" (
	"id" uuid PRIMARY KEY NOT NULL,
	"generation_id" uuid,
	"plan_id" uuid,
	"coach_id" uuid NOT NULL,
	"kind" "feedback_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_dietary_profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dietary_restrictions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"profile_id" uuid NOT NULL,
	"type" "restriction_type" NOT NULL,
	"code" text NOT NULL,
	"note" text
);
--> statement-breakpoint
CREATE TABLE "food_rankings" (
	"food_id" uuid NOT NULL,
	"slot" "meal_slot" NOT NULL,
	"goal" text NOT NULL,
	"score" numeric(6, 4) NOT NULL,
	"samples" integer DEFAULT 0 NOT NULL,
	"computed_at" timestamp with time zone NOT NULL,
	CONSTRAINT "food_rankings_food_id_slot_goal_pk" PRIMARY KEY("food_id","slot","goal")
);
--> statement-breakpoint
CREATE TABLE "food_serving_units" (
	"id" uuid PRIMARY KEY NOT NULL,
	"food_id" uuid NOT NULL,
	"name" text NOT NULL,
	"grams" numeric(6, 1) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source" "food_source" NOT NULL,
	"external_id" text,
	"name" text NOT NULL,
	"name_ur" text,
	"food_group" text NOT NULL,
	"cuisine_tags" text[] DEFAULT '{}' NOT NULL,
	"allergen_tags" text[] DEFAULT '{}' NOT NULL,
	"dietary_flags" jsonb NOT NULL,
	"per_100g" jsonb NOT NULL,
	"cost_tier" smallint DEFAULT 1 NOT NULL,
	"prep_time_min" smallint DEFAULT 15 NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_cache" (
	"input_hash" "bytea" PRIMARY KEY NOT NULL,
	"output" jsonb NOT NULL,
	"model_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plan_items" (
	"id" uuid PRIMARY KEY NOT NULL,
	"plan_id" uuid NOT NULL,
	"day" smallint NOT NULL,
	"meal_index" smallint NOT NULL,
	"meal_slot" "meal_slot" NOT NULL,
	"meal_name" text NOT NULL,
	"food_id" uuid NOT NULL,
	"portion_grams" numeric(6, 1) NOT NULL,
	"macros" jsonb NOT NULL,
	"prep_notes" text,
	"position" smallint DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meal_plans" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"coach_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"status" "plan_status" DEFAULT 'DRAFT' NOT NULL,
	"targets" jsonb NOT NULL,
	"generation_id" uuid,
	"starts_on" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_generations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"coach_id" uuid NOT NULL,
	"plan_id" uuid,
	"kind" "generation_kind" DEFAULT 'INITIAL' NOT NULL,
	"status" "generation_status" DEFAULT 'QUEUED' NOT NULL,
	"inputs" jsonb NOT NULL,
	"config" jsonb NOT NULL,
	"config_version" integer DEFAULT 1 NOT NULL,
	"model_id" text,
	"adapter_version" text,
	"raw_llm_output" jsonb,
	"validation" jsonb,
	"override" jsonb,
	"latency_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "access_gate_attempts" (
	"id" uuid PRIMARY KEY NOT NULL,
	"ip" "inet",
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" uuid PRIMARY KEY NOT NULL,
	"actor_user_id" uuid,
	"actor_role" text,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" uuid,
	"before" jsonb,
	"after" jsonb,
	"ip" "inet",
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "client_attention" (
	"client_id" uuid PRIMARY KEY NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"reasons" jsonb NOT NULL,
	"computed_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"key" text PRIMARY KEY NOT NULL,
	"request_hash" text NOT NULL,
	"response_status" smallint NOT NULL,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"recipient_user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"priority" "notification_priority" DEFAULT 'NORMAL' NOT NULL,
	"payload" jsonb NOT NULL,
	"deep_link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"outlet_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sex" "sex" NOT NULL,
	"dob" text,
	"phone" text,
	"height_cm" numeric(5, 1),
	"activity_level" numeric(4, 3),
	"medical_flags" jsonb,
	"status" "client_status" DEFAULT 'active' NOT NULL,
	"intake" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "coach_assignments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"coach_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"assigned_by" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unassigned_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "coach_notes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"client_id" uuid NOT NULL,
	"coach_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "coaches" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"tier" "coach_tier" DEFAULT 'senior' NOT NULL,
	"caseload_limit" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "coaches_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "role" NOT NULL,
	"org_id" uuid NOT NULL,
	"outlet_id" uuid,
	"created_by" uuid,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outlets" (
	"id" uuid PRIMARY KEY NOT NULL,
	"org_id" uuid NOT NULL,
	"name" text NOT NULL,
	"timezone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text,
	"phone" text,
	"name" text NOT NULL,
	"locale" text DEFAULT 'en' NOT NULL,
	"unit_pref" text,
	"avatar_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_goal_id_client_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."client_goals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_ins" ADD CONSTRAINT "check_ins_vitals_id_vitals_id_fk" FOREIGN KEY ("vitals_id") REFERENCES "public"."vitals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_goals" ADD CONSTRAINT "client_goals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "progress_photos" ADD CONSTRAINT "progress_photos_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vitals" ADD CONSTRAINT "vitals_recorded_by_users_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback_events" ADD CONSTRAINT "ai_feedback_events_generation_id_plan_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."plan_generations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback_events" ADD CONSTRAINT "ai_feedback_events_plan_id_meal_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_feedback_events" ADD CONSTRAINT "ai_feedback_events_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_dietary_profiles" ADD CONSTRAINT "client_dietary_profiles_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_dietary_profiles" ADD CONSTRAINT "client_dietary_profiles_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dietary_restrictions" ADD CONSTRAINT "dietary_restrictions_profile_id_client_dietary_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."client_dietary_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_rankings" ADD CONSTRAINT "food_rankings_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "food_serving_units" ADD CONSTRAINT "food_serving_units_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_items" ADD CONSTRAINT "meal_plan_items_plan_id_meal_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."meal_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plan_items" ADD CONSTRAINT "meal_plan_items_food_id_foods_id_fk" FOREIGN KEY ("food_id") REFERENCES "public"."foods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_plans" ADD CONSTRAINT "meal_plans_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_generations" ADD CONSTRAINT "plan_generations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_generations" ADD CONSTRAINT "plan_generations_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_attention" ADD CONSTRAINT "client_attention_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_user_id_users_id_fk" FOREIGN KEY ("recipient_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_assignments" ADD CONSTRAINT "coach_assignments_assigned_by_users_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_notes_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coaches" ADD CONSTRAINT "coaches_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outlets" ADD CONSTRAINT "outlets_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "check_ins_client_idx" ON "check_ins" USING btree ("client_id","scheduled_for" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "check_ins_status_idx" ON "check_ins" USING btree ("status","scheduled_for");--> statement-breakpoint
CREATE UNIQUE INDEX "check_ins_one_due_per_goal_uq" ON "check_ins" USING btree ("goal_id") WHERE "check_ins"."status" = 'DUE';--> statement-breakpoint
CREATE INDEX "client_goals_client_idx" ON "client_goals" USING btree ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "client_goals_one_active_uq" ON "client_goals" USING btree ("client_id") WHERE "client_goals"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "progress_photos_client_idx" ON "progress_photos" USING btree ("client_id","taken_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "vitals_client_time_idx" ON "vitals" USING btree ("client_id","recorded_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ai_feedback_events_kind_idx" ON "ai_feedback_events" USING btree ("kind","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "dietary_profiles_client_version_uq" ON "client_dietary_profiles" USING btree ("client_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "dietary_profiles_one_active_uq" ON "client_dietary_profiles" USING btree ("client_id") WHERE "client_dietary_profiles"."is_active" = true;--> statement-breakpoint
CREATE INDEX "dietary_restrictions_profile_idx" ON "dietary_restrictions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "food_serving_units_food_idx" ON "food_serving_units" USING btree ("food_id");--> statement-breakpoint
CREATE INDEX "foods_group_idx" ON "foods" USING btree ("food_group");--> statement-breakpoint
CREATE INDEX "foods_name_idx" ON "foods" USING btree ("name");--> statement-breakpoint
CREATE INDEX "meal_plan_items_plan_idx" ON "meal_plan_items" USING btree ("plan_id","day","meal_index");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_plans_client_version_uq" ON "meal_plans" USING btree ("client_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "meal_plans_one_published_uq" ON "meal_plans" USING btree ("client_id") WHERE "meal_plans"."status" = 'PUBLISHED';--> statement-breakpoint
CREATE INDEX "meal_plans_client_idx" ON "meal_plans" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "plan_generations_client_idx" ON "plan_generations" USING btree ("client_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "access_gate_attempts_time_idx" ON "access_gate_attempts" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_log_resource_idx" ON "audit_log" USING btree ("resource_type","resource_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("recipient_user_id","read_at","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "clients_outlet_idx" ON "clients" USING btree ("outlet_id");--> statement-breakpoint
CREATE INDEX "clients_status_idx" ON "clients" USING btree ("status");--> statement-breakpoint
CREATE INDEX "coach_assignments_coach_idx" ON "coach_assignments" USING btree ("coach_id");--> statement-breakpoint
CREATE UNIQUE INDEX "coach_assignments_active_client_uq" ON "coach_assignments" USING btree ("client_id") WHERE "coach_assignments"."unassigned_at" is null;--> statement-breakpoint
CREATE INDEX "coach_notes_client_idx" ON "coach_notes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");