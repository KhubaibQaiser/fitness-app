CREATE TABLE "coach_meal_instructions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"coach_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"rich_text" text NOT NULL,
	"plain_text" text NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "coach_meal_instructions" ADD CONSTRAINT "coach_meal_instructions_coach_id_coaches_id_fk" FOREIGN KEY ("coach_id") REFERENCES "public"."coaches"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "coach_meal_instructions" ADD CONSTRAINT "coach_meal_instructions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "coach_meal_instructions_coach_version_uq" ON "coach_meal_instructions" USING btree ("coach_id","version");
--> statement-breakpoint
CREATE UNIQUE INDEX "coach_meal_instructions_one_active_uq" ON "coach_meal_instructions" USING btree ("coach_id") WHERE "coach_meal_instructions"."is_active" = true;
