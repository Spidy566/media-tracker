import { and, eq, or } from "drizzle-orm";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { db } from "@/lib/db";
import { normalizeBackdropUrl, normalizePosterUrl } from "@/lib/image-url";
import type { Entry } from "@/types/entry";

export function formatSentenceCase(str: string | null | undefined): string | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function syncMediaImages(
  savedItem: { id: string; posterUrl: string | null; backdropUrl: string | null } | null,
  posterUrl: string | null,
  backdropUrl: string | null,
) {
  if (!savedItem) return;

  const normalizedPoster = normalizePosterUrl(posterUrl);
  const normalizedBackdrop = normalizeBackdropUrl(backdropUrl);
  const updates: { posterUrl?: string | null; backdropUrl?: string | null } = {};

  if (normalizedPoster && savedItem.posterUrl !== normalizedPoster) {
    updates.posterUrl = normalizedPoster;
  }
  if (normalizedBackdrop && savedItem.backdropUrl !== normalizedBackdrop) {
    updates.backdropUrl = normalizedBackdrop;
  }

  if (Object.keys(updates).length === 0) return;

  try {
    db.update(mediaItems)
      .set(updates)
      .where(eq(mediaItems.id, savedItem.id))
      .catch((err) => console.warn("Failed to persist media images:", err));
  } catch (err) {
    console.warn("Failed to trigger media image update:", err);
  }
}

export async function fetchFriendsActivity(externalId: string, currentUserId?: string | null) {
  try {
    const [savedItem] = await db
      .select()
      .from(mediaItems)
      .where(eq(mediaItems.externalId, externalId))
      .limit(1);

    let squadEntries: Entry[] = [];
    if (savedItem) {
      const privacyCondition = currentUserId
        ? or(eq(users.isPublic, true), eq(users.id, currentUserId))
        : eq(users.isPublic, true);

      const rawSquad = await db
        .select({
          id: userMediaEntries.id,
          status: userMediaEntries.status,
          rating: userMediaEntries.rating,
          reviewNote: userMediaEntries.reviewNote,
          updatedAt: userMediaEntries.updatedAt,
          user: {
            id: users.id,
            username: users.username,
            displayName: users.displayName,
            avatarUrl: users.avatarUrl,
          },
          media: {
            id: mediaItems.id,
            externalId: mediaItems.externalId,
            mediaType: mediaItems.mediaType,
            title: mediaItems.title,
            releaseYear: mediaItems.releaseYear,
            posterUrl: mediaItems.posterUrl,
            backdropUrl: mediaItems.backdropUrl,
            creator: mediaItems.creator,
            genres: mediaItems.genres,
          },
        })
        .from(userMediaEntries)
        .innerJoin(users, eq(userMediaEntries.userId, users.id))
        .innerJoin(mediaItems, eq(userMediaEntries.mediaItemId, mediaItems.id))
        .where(and(eq(userMediaEntries.mediaItemId, savedItem.id), privacyCondition));

      squadEntries = rawSquad.map((e) => ({
        ...e,
        updatedAt: e.updatedAt.toISOString(),
      }));
    }

    return { savedItem, squadEntries };
  } catch (err) {
    console.warn("Failed to fetch friends activity from DB:", err);
    return { savedItem: null, squadEntries: [] };
  }
}

export function computeFriendsRatingAverage(entries: Entry[]): number | null {
  const rated = entries.filter((e) => typeof e.rating === "number" && e.rating > 0);
  if (rated.length === 0) return null;
  const total = rated.reduce((acc, curr) => acc + (curr.rating ?? 0), 0);
  return Math.round((total / rated.length) * 10) / 10;
}
