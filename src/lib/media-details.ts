import { eq } from "drizzle-orm";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { db } from "@/lib/db";
import { igdbFetch } from "@/lib/igdb";
import { getIgdbCoverUrl, selectIgdbBackdrop } from "@/lib/igdb-helpers";
import { selectTmdbBackdrop, selectTmdbTrailer, tmdbFetch } from "@/lib/tmdb";
import type { Entry } from "@/types/entry";
import type {
  CastMember,
  CollectionPart,
  CrewMember,
  GameScreenshot,
  GameTimeToBeat,
  MediaCollection,
  MediaDetails,
  RecommendationItem,
  TvNextEpisode,
  TvSeason,
  WatchProvidersGroup,
} from "@/types/media-details";

function formatSentenceCase(str: string | null | undefined): string | null {
  if (!str) return null;
  const trimmed = str.trim();
  if (!trimmed) return null;
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

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

  // 1. Check for ESRB rating first (organization 1 or category 1)
  const esrb = ageRatings.find((r) => r.organization === 1 || r.category === 1);
  if (esrb) {
    const code = esrb.rating_category ?? esrb.rating;
    if (code && ESRB_RATINGS[code]) {
      return `ESRB ${ESRB_RATINGS[code]}`;
    }
  }

  // 2. Check for PEGI rating (organization 2 or category 2)
  const pegi = ageRatings.find((r) => r.organization === 2 || r.category === 2);
  if (pegi) {
    const code = pegi.rating_category ?? pegi.rating;
    if (code && PEGI_RATINGS[code]) {
      return PEGI_RATINGS[code];
    }
  }

  return null;
}

export async function getMediaDetails(type: string, id: string): Promise<MediaDetails | null> {
  if (type !== "movie" && type !== "tv" && type !== "game") {
    return null;
  }
  if (!/^\d+$/.test(id)) {
    return null;
  }

  const externalId = type === "game" ? `igdb:${id}` : `tmdb:${type}:${id}`;

  // Helper for querying squad entries from DB
  const fetchSquadActivity = async () => {
    try {
      const [savedItem] = await db
        .select()
        .from(mediaItems)
        .where(eq(mediaItems.externalId, externalId))
        .limit(1);

      let squadEntries: Entry[] = [];
      if (savedItem) {
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
          .where(eq(userMediaEntries.mediaItemId, savedItem.id));

        squadEntries = rawSquad.map((e) => ({
          ...e,
          updatedAt: e.updatedAt.toISOString(),
        }));
      }

      return { savedItem, squadEntries };
    } catch (err) {
      console.warn("Failed to fetch squad activity from DB:", err);
      return { savedItem: null, squadEntries: [] };
    }
  };

  if (type === "movie" || type === "tv") {
    // 1. Fetch TMDB details and DB squad activity in parallel
    const tmdbEndpoint = `/${type}/${id}?append_to_response=videos,credits,images,recommendations,watch/providers,release_dates,content_ratings&include_image_language=en,null`;

    const [tmdbSettled, squadSettled] = await Promise.allSettled([
      tmdbFetch(tmdbEndpoint, { next: { revalidate: 3600 } }),
      fetchSquadActivity(),
    ]);

    if (tmdbSettled.status !== "fulfilled" || !tmdbSettled.value) {
      console.error(
        `Failed to fetch TMDB details for ${type}/${id}:`,
        tmdbSettled.status === "rejected" ? tmdbSettled.reason : "Empty response",
      );
      return null;
    }

    const tmdbData = tmdbSettled.value;
    const { savedItem, squadEntries } =
      squadSettled.status === "fulfilled"
        ? squadSettled.value
        : { savedItem: null, squadEntries: [] };

    const title = tmdbData.title || tmdbData.name || "Untitled";
    const dateStr = tmdbData.release_date || tmdbData.first_air_date;
    const releaseYear = dateStr ? new Date(dateStr).getFullYear() : null;
    const posterUrl = tmdbData.poster_path
      ? `https://image.tmdb.org/t/p/w780${tmdbData.poster_path}`
      : null;
    const backdropUrl = selectTmdbBackdrop(tmdbData.images, tmdbData.backdrop_path);
    const summary = tmdbData.overview || null;
    const tagline = tmdbData.tagline?.trim() || null;
    const genres: string[] = tmdbData.genres?.map((g: { name: string }) => g.name) || [];

    const director =
      tmdbData.credits?.crew?.find((c: { job: string; name: string }) => c.job === "Director")
        ?.name ||
      tmdbData.created_by?.[0]?.name ||
      null;
    const creator = director;

    const trailerUrl = selectTmdbTrailer(tmdbData.videos?.results);

    // Sync backdrop to DB if needed
    if (savedItem && backdropUrl && savedItem.backdropUrl !== backdropUrl) {
      try {
        db.update(mediaItems)
          .set({ backdropUrl })
          .where(eq(mediaItems.id, savedItem.id))
          .catch((err) => console.warn("Failed to persist backdropUrl:", err));
      } catch (err) {
        console.warn("Failed to trigger backdrop update:", err);
      }
    }

    // Age rating
    let ageRating: string | null = null;
    if (type === "movie") {
      const releaseResults = tmdbData.release_dates?.results || [];
      const usRelease = releaseResults.find((r: { iso_3166_1: string }) => r.iso_3166_1 === "US");
      const usCert = usRelease?.release_dates?.find((d: { certification: string }) =>
        Boolean(d.certification?.trim()),
      )?.certification;

      if (usCert) {
        ageRating = usCert.trim();
      } else {
        // Fallback to any certification
        for (const item of releaseResults) {
          const cert = item.release_dates?.find((d: { certification: string }) =>
            Boolean(d.certification?.trim()),
          )?.certification;
          if (cert) {
            ageRating = cert.trim();
            break;
          }
        }
      }
    } else {
      const contentRatings = tmdbData.content_ratings?.results || [];
      const usRating = contentRatings.find(
        (r: { iso_3166_1: string }) => r.iso_3166_1 === "US",
      )?.rating;
      if (usRating?.trim()) {
        ageRating = usRating.trim();
      } else if (contentRatings[0]?.rating?.trim()) {
        ageRating = contentRatings[0].rating.trim();
      }
    }

    // Status
    const rawStatus = tmdbData.status as string | undefined;
    const status = formatSentenceCase(rawStatus);

    // Runtime / Seasons
    const runtimeMinutes =
      type === "movie" && typeof tmdbData.runtime === "number" && tmdbData.runtime > 0
        ? tmdbData.runtime
        : null;
    const seasonsCount =
      type === "tv" && typeof tmdbData.number_of_seasons === "number"
        ? tmdbData.number_of_seasons
        : null;
    const episodesCount =
      type === "tv" && typeof tmdbData.number_of_episodes === "number"
        ? tmdbData.number_of_episodes
        : null;

    // TMDB Score (rounded to 1 decimal)
    const externalScore =
      typeof tmdbData.vote_average === "number" && tmdbData.vote_average > 0
        ? Math.round(tmdbData.vote_average * 10) / 10
        : null;

    // First 8 Cast members with profile_path (w185)
    const cast: CastMember[] = (tmdbData.credits?.cast || [])
      .slice(0, 8)
      .map((c: { id: number; name: string; character: string; profile_path: string | null }) => ({
        id: c.id,
        name: c.name,
        character: c.character,
        profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        profilePath: c.profile_path || null,
      }));

    // Crew: directors, writers, composer (deduplicated by id)
    const rawCrew: Array<{ id: number; name: string; job: string; profile_path: string | null }> =
      tmdbData.credits?.crew || [];

    const deduplicateCrew = (members: typeof rawCrew): CrewMember[] => {
      const seen = new Set<number>();
      return members
        .filter((c) => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return true;
        })
        .map((c) => ({
          id: c.id,
          name: c.name,
          job: c.job,
          profilePath: c.profile_path || null,
        }));
    };

    const directors = deduplicateCrew(rawCrew.filter((c) => c.job === "Director"));

    const writerJobs = new Set(["Writer", "Screenplay", "Story"]);
    const writers = deduplicateCrew(rawCrew.filter((c) => writerJobs.has(c.job)));

    const composerJobs = new Set([
      "Original Music Composer",
      "Music",
      "Composer",
      "Songs",
      "Theme Song Performance",
      "Soundtrack",
    ]);

    const musicJobPriority: Record<string, number> = {
      "Original Music Composer": 6,
      Composer: 5,
      Songs: 4,
      "Theme Song Performance": 3,
      Music: 2,
      Soundtrack: 1,
    };

    const composerMap = new Map<
      number,
      { id: number; name: string; job: string; profile_path: string | null; priority: number }
    >();

    for (const c of rawCrew) {
      if (!composerJobs.has(c.job)) continue;
      const priority = musicJobPriority[c.job] || 0;
      const existing = composerMap.get(c.id);
      if (!existing || priority > existing.priority) {
        composerMap.set(c.id, {
          id: c.id,
          name: c.name,
          job: c.job,
          profile_path: c.profile_path || null,
          priority,
        });
      }
    }

    const composers: CrewMember[] = Array.from(composerMap.values()).map((c) => ({
      id: c.id,
      name: c.name,
      job: c.job,
      profilePath: c.profile_path,
    }));

    const composer: CrewMember | null = composers[0] || null;

    // TV: creators from created_by
    const creators: CrewMember[] =
      type === "tv" && Array.isArray(tmdbData.created_by)
        ? tmdbData.created_by
            .filter((c: { id: number }) => c.id)
            .map((c: { id: number; name: string; profile_path?: string | null }) => ({
              id: c.id,
              name: c.name,
              job: "Creator",
              profilePath: c.profile_path || null,
            }))
        : [];

    // Watch providers (region IN, fallback US) grouped into stream, rent, buy with w92 logo paths
    let watchProviders: WatchProvidersGroup | null = null;
    const allProviders = tmdbData["watch/providers"]?.results;
    if (allProviders) {
      const inProviders = allProviders.IN;
      const usProviders = allProviders.US;

      const hasProviders = (p: { flatrate?: unknown[]; rent?: unknown[]; buy?: unknown[] }) =>
        Boolean(
          (p?.flatrate && p.flatrate.length > 0) ||
            (p?.rent && p.rent.length > 0) ||
            (p?.buy && p.buy.length > 0),
        );

      const regionData =
        inProviders && hasProviders(inProviders)
          ? inProviders
          : usProviders && hasProviders(usProviders)
            ? usProviders
            : null;

      if (regionData) {
        const mapProvider = (p: {
          provider_id: number;
          provider_name: string;
          logo_path: string;
        }) => ({
          id: p.provider_id,
          name: p.provider_name,
          logoPath: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
        });

        const stream = (regionData.flatrate || []).map(mapProvider);
        const rent = (regionData.rent || []).map(mapProvider);
        const buy = (regionData.buy || []).map(mapProvider);

        if (stream.length > 0 || rent.length > 0 || buy.length > 0) {
          watchProviders = {
            stream,
            rent,
            buy,
            attribution: "Data by JustWatch",
          };
        }
      }
    }

    // First 10 recommendations
    const recommendations: RecommendationItem[] = (tmdbData.recommendations?.results || [])
      .slice(0, 10)
      .map(
        (r: {
          id: number;
          title?: string;
          name?: string;
          poster_path?: string | null;
          release_date?: string;
          first_air_date?: string;
          vote_average?: number;
        }) => {
          const recDate = r.release_date || r.first_air_date;
          return {
            id: r.id,
            externalId: `tmdb:${type}:${r.id}`,
            title: r.title || r.name || "Untitled",
            mediaType: type,
            posterUrl: r.poster_path ? `https://image.tmdb.org/t/p/w780${r.poster_path}` : null,
            releaseYear: recDate ? new Date(recDate).getFullYear() : null,
            rating: r.vote_average ? Math.round(r.vote_average * 10) / 10 : null,
          };
        },
      );

    // Collection (movies only): fetch parts from /collection/{id}
    let collection: MediaCollection | null = null;
    if (type === "movie" && tmdbData.belongs_to_collection?.id) {
      try {
        const collData = await tmdbFetch(`/collection/${tmdbData.belongs_to_collection.id}`, {
          next: { revalidate: 3600 },
        });
        if (collData?.parts && Array.isArray(collData.parts)) {
          const parts: CollectionPart[] = collData.parts.map(
            (p: {
              id: number;
              title: string;
              poster_path: string | null;
              release_date?: string;
              vote_average?: number;
            }) => ({
              id: p.id,
              title: p.title,
              posterUrl: p.poster_path ? `https://image.tmdb.org/t/p/w780${p.poster_path}` : null,
              releaseYear: p.release_date ? new Date(p.release_date).getFullYear() : null,
              rating: p.vote_average ? Math.round(p.vote_average * 10) / 10 : null,
              isCurrent: p.id === Number(id),
            }),
          );

          // Sort collection parts chronologically
          parts.sort((a, b) => (a.releaseYear ?? 0) - (b.releaseYear ?? 0));

          collection = {
            id: collData.id,
            name: collData.name || tmdbData.belongs_to_collection.name,
            parts,
          };
        }
      } catch (collErr) {
        console.warn("Failed to fetch collection details:", collErr);
      }
    }

    // TV seasons with episode counts
    let tvSeasons: TvSeason[] | undefined;
    let tvNextEpisode: TvNextEpisode | null = null;

    if (type === "tv") {
      if (Array.isArray(tmdbData.seasons)) {
        tvSeasons = tmdbData.seasons
          .filter((s: { season_number: number }) => s.season_number > 0) // exclude specials if desired, or keep all
          .map(
            (s: {
              id: number;
              name: string;
              season_number: number;
              episode_count: number;
              air_date?: string | null;
              poster_path?: string | null;
            }) => ({
              id: s.id,
              name: s.name,
              seasonNumber: s.season_number,
              episodeCount: s.episode_count,
              airDate: s.air_date || null,
              posterUrl: s.poster_path ? `https://image.tmdb.org/t/p/w780${s.poster_path}` : null,
            }),
          );
      }

      if (tmdbData.next_episode_to_air) {
        tvNextEpisode = {
          id: tmdbData.next_episode_to_air.id,
          name: tmdbData.next_episode_to_air.name,
          seasonNumber: tmdbData.next_episode_to_air.season_number,
          episodeNumber: tmdbData.next_episode_to_air.episode_number,
          airDate: tmdbData.next_episode_to_air.air_date || null,
          overview: tmdbData.next_episode_to_air.overview || null,
        };
      }
    }

    // Compute squad rating average
    const ratedSquad = squadEntries.filter((e) => typeof e.rating === "number" && e.rating > 0);
    const squadRatingAverage =
      ratedSquad.length > 0
        ? Math.round(
            (ratedSquad.reduce((acc, curr) => acc + (curr.rating ?? 0), 0) / ratedSquad.length) *
              10,
          ) / 10
        : null;

    return {
      id: savedItem?.id || externalId,
      externalId,
      mediaType: type,
      title,
      releaseYear,
      posterUrl,
      backdropUrl,
      summary,
      tagline,
      genres,
      creator,
      trailerUrl,
      status,
      runtimeMinutes,
      seasonsCount,
      episodesCount,
      ageRating,
      externalScore,
      squadEntries,
      squadRatingAverage,
      watchProviders,
      cast,
      directors,
      writers,
      composer,
      composers,
      creators,
      collection,
      tvSeasons,
      tvNextEpisode,
      recommendations,
    };
  }

  // --- IGDB Games ---
  const apicalypse = `where id = ${id}; fields name,summary,storyline,rating,aggregated_rating,age_ratings.*,platforms.name,game_modes.name,player_perspectives.name,themes.name,similar_games.name,similar_games.cover.url,similar_games.first_release_date,similar_games.rating,involved_companies.company.name,involved_companies.developer,involved_companies.publisher,screenshots.url,screenshots.width,screenshots.height,franchises.name,videos.video_id,first_release_date,genres.name,cover.url,artworks.url,artworks.width,artworks.height; limit 1;`;
  const ttbApicalypse = `where game_id = ${id}; fields hastily,normally,completely; limit 1;`;

  // Fetch IGDB game, IGDB time-to-beat, and DB squad activity in parallel with Promise.allSettled
  const [gameSettled, ttbSettled, squadSettled] = await Promise.allSettled([
    igdbFetch("/games", apicalypse, { next: { revalidate: 3600 } }),
    igdbFetch("/game_time_to_beats", ttbApicalypse, {
      next: { revalidate: 3600 },
    }),
    fetchSquadActivity(),
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

  const title = game.name || "Untitled";
  const releaseYear = game.first_release_date
    ? new Date(game.first_release_date * 1000).getFullYear()
    : null;
  const posterUrl = getIgdbCoverUrl(game.cover?.url, "cover_big");

  const artworks = game.artworks;
  const screenshotsRaw = game.screenshots;
  const backdropUrl = await selectIgdbBackdrop(artworks, screenshotsRaw);

  // Sync backdrop to DB if needed
  if (savedItem && backdropUrl && savedItem.backdropUrl !== backdropUrl) {
    try {
      db.update(mediaItems)
        .set({ backdropUrl })
        .where(eq(mediaItems.id, savedItem.id))
        .catch((err) => console.warn("Failed to persist backdropUrl:", err));
    } catch (err) {
      console.warn("Failed to trigger backdrop update:", err);
    }
  }

  const summary = game.summary || game.storyline || null;
  const genres: string[] = game.genres?.map((g: { name: string }) => g.name) || [];

  // Developer & Publisher separation
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

  // Trailer
  const videos = game.videos;
  const trailerUrl = videos?.[0]?.video_id
    ? `https://www.youtube.com/embed/${videos[0].video_id}`
    : null;

  // Age Rating
  const ageRating = parseIgdbAgeRating(game.age_ratings);

  // Status
  const status = game.first_release_date
    ? game.first_release_date * 1000 > Date.now()
      ? "Upcoming"
      : "Released"
    : null;

  // External Score (normalized to 10-point scale with 1 decimal)
  const rawScore =
    typeof game.rating === "number" && game.rating > 0
      ? game.rating
      : typeof game.aggregated_rating === "number" && game.aggregated_rating > 0
        ? game.aggregated_rating
        : null;
  const externalScore = rawScore ? Math.round((rawScore / 10) * 10) / 10 : null;

  // Platforms, Modes, Perspectives, Themes, Franchise
  const platforms = game.platforms?.map((p: { name: string }) => p.name).filter(Boolean) || [];
  const gameModes = game.game_modes?.map((m: { name: string }) => m.name).filter(Boolean) || [];
  const playerPerspectives =
    game.player_perspectives?.map((p: { name: string }) => p.name).filter(Boolean) || [];
  const themes = game.themes?.map((t: { name: string }) => t.name).filter(Boolean) || [];
  const franchise = game.franchises?.[0]?.name || null;

  // Screenshots: full 1080p and crisp thumbnail
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

  // Time to beat: convert seconds to hours
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

  // Similar games as recommendations (up to 10)
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
          ? new Date(sim.first_release_date * 1000).getFullYear()
          : null,
        rating:
          typeof sim.rating === "number" && sim.rating > 0
            ? Math.round((sim.rating / 10) * 10) / 10
            : null,
      }),
    );

  // Compute squad rating average
  const ratedSquad = squadEntries.filter((e) => typeof e.rating === "number" && e.rating > 0);
  const squadRatingAverage =
    ratedSquad.length > 0
      ? Math.round(
          (ratedSquad.reduce((acc, curr) => acc + (curr.rating ?? 0), 0) / ratedSquad.length) * 10,
        ) / 10
      : null;

  return {
    id: savedItem?.id || externalId,
    externalId,
    mediaType: "game",
    title,
    releaseYear,
    posterUrl,
    backdropUrl,
    summary,
    tagline: null,
    genres,
    creator,
    trailerUrl,
    status,
    runtimeMinutes: null,
    seasonsCount: null,
    episodesCount: null,
    ageRating,
    externalScore,
    squadEntries,
    squadRatingAverage,
    timeToBeat,
    platforms,
    gameModes,
    playerPerspectives,
    themes,
    developer,
    publisher,
    screenshots,
    franchise,
    recommendations,
  };
}
