import { relations } from "drizzle-orm";
import {
  index,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// 1. Enums
export const mediaTypeEnum = pgEnum("media_type", ["movie", "tv", "game"]);
export const mediaStatusEnum = pgEnum("media_status", ["want_to", "doing", "done", "dropped"]);

// 2A. Users (The Squad)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2B. Media Items (The Universal Cache)
export const mediaItems = pgTable(
  "media_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: text("external_id").notNull().unique(),
    mediaType: mediaTypeEnum("media_type").notNull(),
    title: text("title").notNull(),
    releaseYear: integer("release_year"),
    posterUrl: text("poster_url"),
    backdropUrl: text("backdrop_url"),
    trailerUrl: text("trailer_url"),
    creator: text("creator"),
    summary: text("summary"),
    genres: text("genres").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_media_items_media_type").on(table.mediaType)],
);

// 2C. User Media Entries (The Tracking Bridge)
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
    rating: smallint("rating"),
    reviewNote: text("review_note"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique("user_media_unique").on(table.userId, table.mediaItemId),
    // Fast lookup for a user's shelf by status: WHERE user_id = X AND status = Y
    index("idx_user_entries_user_status").on(table.userId, table.status),
    // Fast sort for squad feed: ORDER BY updated_at DESC
    index("idx_user_entries_updated_at").on(table.updatedAt),
    // Fast lookup for squad activity on media detail: WHERE media_item_id = X
    index("idx_user_entries_media_item").on(table.mediaItemId),
  ],
);

// 3. Relations
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
