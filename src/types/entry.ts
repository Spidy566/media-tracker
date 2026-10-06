import type { MediaStatus } from "@/components/media-card";

export interface EntryUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface EntryMedia {
  id: string;
  externalId: string;
  mediaType: "movie" | "tv" | "game";
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  creator: string | null;
  genres: string[];
}

export interface Entry {
  id: string;
  status: MediaStatus;
  rating: number | null;
  reviewNote: string | null;
  updatedAt: string;
  user: EntryUser;
  media: EntryMedia;
}
