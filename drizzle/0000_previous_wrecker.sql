CREATE TYPE "public"."media_status" AS ENUM('want_to', 'doing', 'done', 'dropped');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('movie', 'tv', 'game');--> statement-breakpoint
CREATE TABLE "media_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_id" text NOT NULL,
	"media_type" "media_type" NOT NULL,
	"title" text NOT NULL,
	"release_year" integer,
	"poster_url" text,
	"backdrop_url" text,
	"trailer_url" text,
	"creator" text,
	"summary" text,
	"genres" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_items_external_id_unique" UNIQUE("external_id")
);
--> statement-breakpoint
CREATE TABLE "user_media_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"media_item_id" uuid NOT NULL,
	"status" "media_status" DEFAULT 'want_to' NOT NULL,
	"rating" smallint,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_media_unique" UNIQUE("user_id","media_item_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "user_media_entries" ADD CONSTRAINT "user_media_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_media_entries" ADD CONSTRAINT "user_media_entries_media_item_id_media_items_id_fk" FOREIGN KEY ("media_item_id") REFERENCES "public"."media_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_media_items_media_type" ON "media_items" USING btree ("media_type");--> statement-breakpoint
CREATE INDEX "idx_user_entries_user_status" ON "user_media_entries" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_user_entries_updated_at" ON "user_media_entries" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_user_entries_media_item" ON "user_media_entries" USING btree ("media_item_id");