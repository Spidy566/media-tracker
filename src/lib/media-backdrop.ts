import { eq } from "drizzle-orm";
import { mediaItems } from "@/db/schema";
import { db } from "@/lib/db";
import { igdbFetch } from "@/lib/igdb";
import { selectIgdbBackdrop } from "@/lib/igdb-helpers";
import { selectTmdbBackdrop, tmdbFetch } from "@/lib/tmdb";

interface MediaBackdropInput {
  id: string;
  externalId: string;
  mediaType: string;
  backdropUrl?: string | null;
}

export async function ensureMediaBackdrop(media: MediaBackdropInput): Promise<string | null> {
  if (media.backdropUrl) {
    return media.backdropUrl;
  }

  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), 800);
  });

  const fetchPromise = (async (): Promise<string | null> => {
    try {
      const parts = media.externalId.split(":");
      const numericId = parts[parts.length - 1];
      if (!numericId || !/^\d+$/.test(numericId)) {
        return null;
      }

      let backdropUrl: string | null = null;

      if (media.mediaType === "movie" || media.mediaType === "tv") {
        const endpoint = media.mediaType === "tv" ? `/tv/${numericId}` : `/movie/${numericId}`;
        const data = await tmdbFetch(
          `${endpoint}?append_to_response=videos,credits,images&include_image_language=en,null`,
        );
        backdropUrl = selectTmdbBackdrop(data?.images, data?.backdrop_path);
      } else if (media.mediaType === "game") {
        const apicalypse = `where id = ${numericId}; fields artworks.url,artworks.width,artworks.height,screenshots.url,screenshots.width,screenshots.height; limit 1;`;
        const games = await igdbFetch("/games", apicalypse);
        if (Array.isArray(games) && games.length > 0) {
          const game = games[0] as {
            artworks?: { url?: string; width?: number; height?: number }[];
            screenshots?: { url?: string; width?: number; height?: number }[];
          };
          backdropUrl = await selectIgdbBackdrop(game.artworks, game.screenshots);
        }
      }

      if (backdropUrl) {
        await db.update(mediaItems).set({ backdropUrl }).where(eq(mediaItems.id, media.id));
        return backdropUrl;
      }

      return null;
    } catch (err) {
      console.error(`Failed to ensure backdrop for ${media.externalId}:`, err);
      return null;
    }
  })();

  try {
    return await Promise.race([fetchPromise, timeoutPromise]);
  } catch {
    return null;
  }
}
