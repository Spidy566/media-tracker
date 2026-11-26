import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl, selectIgdbBackdrop } from "@/lib/igdb-helpers";
import {
  computeFriendsRatingAverage,
  fetchFriendsActivity,
  syncMediaImages,
} from "@/lib/media-details-shared";
import type {
  GameScreenshot,
  GameTimeToBeat,
  MediaDetails,
  RecommendationItem,
} from "@/types/media-details";

const ESRB_RATINGS: Record<number, string> = {
  1: "RP",
  2: "EC",
  3: "E",
  4: "E10+",
  5: "T",
  6: "M",
  7: "AO",
};

const PEGI_RATINGS: Record<number, string> = {
  8: "PEGI 3",
  9: "PEGI 7",
  10: "PEGI 12",
  11: "PEGI 16",
  12: "PEGI 18",
};

function parseIgdbAgeRating(
  ageRatings?: Array<{
    id?: number;
    organization?: number;
    rating_category?: number;
    category?: number;
    rating?: number;
  }>,
): string | null {
  if (!ageRatings || ageRatings.length === 0) return null;

  const esrb = ageRatings.find((r) => r.organization === 1 || r.category === 1);
  if (esrb) {
    const code = esrb.rating_category ?? esrb.rating;
    if (code && ESRB_RATINGS[code]) return `ESRB ${ESRB_RATINGS[code]}`;
  }

  const pegi = ageRatings.find((r) => r.organization === 2 || r.category === 2);
  if (pegi) {
    const code = pegi.rating_category ?? pegi.rating;
    if (code && PEGI_RATINGS[code]) return PEGI_RATINGS[code];
  }

  return null;
}

/**
 * Fetches and normalizes Game details from IGDB alongside DB friends activity.
 */
export async function getIgdbMediaDetails(
  id: string,
  externalId: string,
  currentUserId?: string | null,
): Promise<MediaDetails | null> {
  const apicalypse = `where id = ${id}; fields name,summary,storyline,rating,aggregated_rating,age_ratings.*,platforms.name,game_modes.name,player_perspectives.name,themes.name,similar_games.name,similar_games.cover.url,similar_games.first_release_date,similar_games.rating,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,screenshots.url,screenshots.width,screenshots.height,franchises.name,videos.video_id,first_release_date,genres.name,cover.url,artworks.url,artworks.width,artworks.height; limit 1;`;
  const ttbApicalypse = `where game_id = ${id}; fields hastily,normally,completely; limit 1;`;

  const [gameSettled, ttbSettled, squadSettled] = await Promise.allSettled([
    igdbFetch("/games", apicalypse, { next: { revalidate: 3600 } }),
    igdbFetch("/game_time_to_beats", ttbApicalypse, { next: { revalidate: 3600 } }),
    fetchFriendsActivity(externalId, currentUserId),
  ]);

  if (gameSettled.status !== "fulfilled" || !gameSettled.value?.[0]) {
    console.error(
      `Failed to fetch IGDB game details for ${id}:`,
      gameSettled.status === "rejected" ? gameSettled.reason : "Game not found",
    );
    return null;
  }

  const game = gameSettled.value[0];
  const { savedItem, squadEntries } =
    squadSettled.status === "fulfilled"
      ? squadSettled.value
      : { savedItem: null, squadEntries: [] };

  const posterUrl = getIgdbCoverUrl(game.cover?.url, "cover_big");
  const backdropUrl = await selectIgdbBackdrop(game.artworks, game.screenshots);

  syncMediaImages(savedItem, posterUrl, backdropUrl);

  const developers = (game.involved_companies || [])
    .filter((c: { developer?: boolean }) => c.developer)
    .map((c: { company?: { name: string } }) => c.company?.name)
    .filter(Boolean) as string[];
  const publishers = (game.involved_companies || [])
    .filter((c: { publisher?: boolean }) => c.publisher)
    .map((c: { company?: { name: string } }) => c.company?.name)
    .filter(Boolean) as string[];

  const developer = developers.length > 0 ? developers.join(", ") : null;
  const publisher = publishers.length > 0 ? publishers.join(", ") : null;
  const creator = developer || publisher || game.involved_companies?.[0]?.company?.name || null;

  const rawScore =
    typeof game.rating === "number" && game.rating > 0
      ? game.rating
      : typeof game.aggregated_rating === "number" && game.aggregated_rating > 0
        ? game.aggregated_rating
        : null;

  const screenshots: GameScreenshot[] = (game.screenshots || []).map(
    (s: { id?: number; url?: string; width?: number; height?: number }) => {
      const normalized = s.url?.startsWith("http") ? s.url : `https:${s.url || ""}`;
      return {
        id: s.id,
        url: normalized.replace("t_thumb", "t_1080p"),
        thumbnailUrl: normalized.replace("t_thumb", "t_screenshot_big"),
        width: s.width,
        height: s.height,
      };
    },
  );

  let timeToBeat: GameTimeToBeat | null = null;
  if (ttbSettled.status === "fulfilled" && ttbSettled.value?.[0]) {
    const rawTtb = ttbSettled.value[0];
    const convertHours = (sec?: number) =>
      typeof sec === "number" && sec > 0 ? Math.round(sec / 3600) : null;
    const hastily = convertHours(rawTtb.hastily);
    const normally = convertHours(rawTtb.normally);
    const completely = convertHours(rawTtb.completely);
    if (hastily !== null || normally !== null || completely !== null) {
      timeToBeat = { hastily, normally, completely };
    }
  }

  const recommendations: RecommendationItem[] = (game.similar_games || [])
    .slice(0, 10)
    .map(
      (sim: {
        id: number;
        name: string;
        cover?: { url?: string };
        first_release_date?: number;
        rating?: number;
      }) => ({
        id: sim.id,
        externalId: `igdb:${sim.id}`,
        title: sim.name,
        mediaType: "game",
        posterUrl: getIgdbCoverUrl(sim.cover?.url, "cover_big"),
        releaseYear: sim.first_release_date
          ? new Date(sim.first_release_date * 1000).getUTCFullYear()
          : null,
        rating:
          typeof sim.rating === "number" && sim.rating > 0
            ? Math.round((sim.rating / 10) * 10) / 10
            : null,
      }),
    );

  return {
    id: savedItem?.id || externalId,
    externalId,
    mediaType: "game",
    title: game.name || "Untitled",
    releaseYear: game.first_release_date
      ? new Date(game.first_release_date * 1000).getUTCFullYear()
      : null,
    posterUrl,
    backdropUrl,
    summary: game.summary || game.storyline || null,
    tagline: null,
    genres: game.genres?.map((g: { name: string }) => g.name) || [],
    creator,
    trailerUrl: game.videos?.[0]?.video_id
      ? `https://www.youtube.com/embed/${game.videos[0].video_id}`
      : null,
    status: game.first_release_date
      ? game.first_release_date * 1000 > Date.now()
        ? "Upcoming"
        : "Released"
      : null,
    runtimeMinutes: null,
    seasonsCount: null,
    episodesCount: null,
    ageRating: parseIgdbAgeRating(game.age_ratings),
    externalScore: rawScore ? Math.round((rawScore / 10) * 10) / 10 : null,
    squadEntries,
    squadRatingAverage: computeFriendsRatingAverage(squadEntries),
    timeToBeat,
    platforms: game.platforms?.map((p: { name: string }) => p.name).filter(Boolean) || [],
    gameModes: game.game_modes?.map((m: { name: string }) => m.name).filter(Boolean) || [],
    playerPerspectives:
      game.player_perspectives?.map((p: { name: string }) => p.name).filter(Boolean) || [],
    themes: game.themes?.map((t: { name: string }) => t.name).filter(Boolean) || [],
    developer,
    publisher,
    screenshots,
    franchise: game.franchises?.[0]?.name || null,
    recommendations,
  };
}
