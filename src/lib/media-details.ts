import { getIgdbMediaDetails } from "@/lib/media-details-igdb";
import { getTmdbMediaDetails } from "@/lib/media-details-tmdb";
import type { MediaDetails } from "@/types/media-details";

/**
 * Fetches normalized details for a movie, TV series, or game by raw external ID.
 */
export async function getMediaDetails(
  type: string,
  id: string,
  currentUserId?: string | null,
): Promise<MediaDetails | null> {
  if (type !== "movie" && type !== "tv" && type !== "game") {
    return null;
  }
  if (!/^\d+$/.test(id)) {
    return null;
  }

  const externalId = type === "game" ? `igdb:${id}` : `tmdb:${type}:${id}`;

  if (type === "game") {
    return getIgdbMediaDetails(id, externalId, currentUserId);
  }
  return getTmdbMediaDetails(type, id, externalId, currentUserId);
}
