import { pgTable, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const movieStatusEnum = pgEnum("movie_status", [
  "PLAN_TO_WATCH",
  "WATCHING",
  "COMPLETED",
  "DROPPED",
  "ON_HOLD",
]);

export const movies = pgTable("movies", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tmdbId: integer("tmdb_id").notNull().unique(),
  title: text("title").notNull(),
  posterPath: text("poster_path"),
  releaseDate: timestamp("release_date"),
  overview: text("overview"),
  status: movieStatusEnum("status").default("PLAN_TO_WATCH").notNull(),
  rating: integer("rating"),
  notes: text("notes"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const gameStatusEnum = pgEnum("game_status", [
  "PLAN_TO_PLAY",
  "PLAYING",
  "COMPLETED",
  "DROPPED",
  "ON_HOLD",
]);

export const games = pgTable("games", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  igdbId: integer("igdb_id").notNull().unique(),
  title: text("title").notNull(),
  coverUrl: text("cover_url"),
  releaseDate: timestamp("release_date"),
  summary: text("summary"),
  genres: text("genres").array().notNull().default([]),
  status: gameStatusEnum("status").default("PLAN_TO_PLAY").notNull(),
  rating: integer("rating"),
  notes: text("notes"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});