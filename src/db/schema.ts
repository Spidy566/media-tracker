import {
  pgTable,
  text,
  integer,
  timestamp,
  pgEnum,
  uuid,
  smallint,
  unique,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// 1. Enums
export const mediaTypeEnum = pgEnum("media_type", [
  "movie",
  "tv",
  "game",
  "book",
]);

export const mediaStatusEnum = pgEnum("media_status", [
  "want_to", // Backlog / Wishlist
  "doing",   // Watching / Playing / Reading
  "done",    // Finished
  "dropped", // Abandoned / DNF
]);

// 2. Users (The Squad)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(), // e.g. "spidy"
  displayName: text("display_name").notNull(),   // e.g. "Spidy"
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 3. Media Items (The Universal Cache)
export const mediaItems = pgTable("media_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Provider-prefixed ID: "tmdb:movie:693134", "igdb:119133", "gb:abc"
  externalId: text("external_id").notNull().unique(),
  mediaType: mediaTypeEnum("media_type").notNull(),
  title: text("title").notNull(),
  releaseYear: integer("release_year"),
  posterUrl: text("poster_url"),
  creator: text("creator"), // Director / Studio / Author
  summary: text("summary"),
  genres: text("genres").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 4. User Media Entries (The Tracking Bridge)
export const userMediaEntries = pgTable(
  "user_media_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mediaItemId: uuid("media_item_id")
      .notNull()
      .references(() => mediaItems.id, { onDelete: "cascade" }),
    status: mediaStatusEnum("status").notNull().default("want_to"),
    rating: smallint("rating"), // 1 to 10
    reviewNote: text("review_note"), // Quick thoughts
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    // Rule: One user can only track a specific media item once
    unique("user_media_unique").on(table.userId, table.mediaItemId),
  ]
);

// 5. Relations (Makes querying in Drizzle effortless)
export const usersRelations = relations(users, ({ many }) => ({
  entries: many(userMediaEntries),
}));

export const mediaItemsRelations = relations(mediaItems, ({ many }) => ({
  entries: many(userMediaEntries),
}));

export const userMediaEntriesRelations = relations(userMediaEntries, ({ one }) => ({
  user: one(users, {
    fields: [userMediaEntries.userId],
    references: [users.id],
  }),
  mediaItem: one(mediaItems, {
    fields: [userMediaEntries.mediaItemId],
    references: [mediaItems.id],
  }),
}));