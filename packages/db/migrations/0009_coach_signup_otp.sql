CREATE TYPE "public"."otp_purpose" AS ENUM('signup_coach', 'password_reset');--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "join_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified_at" timestamp with time zone;--> statement-breakpoint
CREATE TABLE "otp_challenges" (
	"id" uuid PRIMARY KEY NOT NULL,
	"purpose" "otp_purpose" NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"code_hash" text NOT NULL,
	"payload" jsonb,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "organizations_join_code_uq" ON "organizations" USING btree ("join_code");--> statement-breakpoint
CREATE UNIQUE INDEX "users_phone_active_uq" ON "users" USING btree ("phone") WHERE "deleted_at" IS NULL;--> statement-breakpoint
CREATE INDEX "otp_challenges_email_purpose_idx" ON "otp_challenges" USING btree ("email","purpose");--> statement-breakpoint
CREATE INDEX "otp_challenges_active_idx" ON "otp_challenges" USING btree ("email","purpose","expires_at") WHERE "consumed_at" IS NULL;
