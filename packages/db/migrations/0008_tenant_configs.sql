CREATE TABLE "tenant_configs" (
	"org_id" uuid PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"manifest" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tenant_configs" ADD CONSTRAINT "tenant_configs_org_id_organizations_id_fk" FOREIGN KEY ("org_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tenant_configs_slug_uq" ON "tenant_configs" USING btree ("slug");
