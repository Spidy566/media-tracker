import {
  computeFriendsRatingAverage,
  fetchFriendsActivity,
  formatSentenceCase,
  syncMediaImages,
} from "@/lib/media-details-shared";
import { selectTmdbBackdrop, selectTmdbTrailer, tmdbFetch } from "@/lib/tmdb";
import type {
  CastMember,
  CollectionPart,
  CrewMember,
  MediaCollection,
  MediaDetails,
  RecommendationItem,
  TvNextEpisode,
  TvSeason,
  WatchProvidersGroup,
} from "@/types/media-details";

const WRITER_JOBS = new Set(["Writer", "Screenplay", "Story"]);
const MUSIC_JOB_PRIORITY: Record<string, number> = {
  "Original Music Composer": 6,
  Composer: 5,
  Songs: 4,
  "Theme Song Performance": 3,
  Music: 2,
  Soundtrack: 1,
};

function extractTmdbAgeRating(
  type: "movie" | "tv",
  // biome-ignore lint/suspicious/noExplicitAny: TMDB nested payload
  tmdbData: any,
): string | null {
  if (type === "movie") {
    const releaseResults = tmdbData.release_dates?.results || [];
    const usRelease = releaseResults.find((r: { iso_3166_1: string }) => r.iso_3166_1 === "US");
    const usCert = usRelease?.release_dates?.find((d: { certification: string }) =>
      Boolean(d.certification?.trim()),
    )?.certification;
    if (usCert) return usCert.trim();

    for (const item of releaseResults) {
      const cert = item.release_dates?.find((d: { certification: string }) =>
        Boolean(d.certification?.trim()),
      )?.certification;
      if (cert) return cert.trim();
    }
    return null;
  }

  const contentRatings = tmdbData.content_ratings?.results || [];
  const usRating = contentRatings.find(
    (r: { iso_3166_1: string }) => r.iso_3166_1 === "US",
  )?.rating;
  if (usRating?.trim()) return usRating.trim();
  if (contentRatings[0]?.rating?.trim()) return contentRatings[0].rating.trim();
  return null;
}

function extractTmdbCrew(
  rawCrew: Array<{ id: number; name: string; job: string; profile_path: string | null }>,
) {
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
  const writers = deduplicateCrew(rawCrew.filter((c) => WRITER_JOBS.has(c.job)));

  const composerMap = new Map<
    number,
    { id: number; name: string; job: string; profile_path: string | null; priority: number }
  >();
  for (const c of rawCrew) {
    const priority = MUSIC_JOB_PRIORITY[c.job];
    if (!priority) continue;
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

  return { directors, writers, composers, composer: composers[0] || null };
}

function extractWatchProviders(
  // biome-ignore lint/suspicious/noExplicitAny: TMDB watch providers object
  allProviders: any,
): WatchProvidersGroup | null {
  if (!allProviders) return null;

  const hasProviders = (p: { flatrate?: unknown[]; rent?: unknown[]; buy?: unknown[] }) =>
    Boolean(
      (p?.flatrate && p.flatrate.length > 0) ||
        (p?.rent && p.rent.length > 0) ||
        (p?.buy && p.buy.length > 0),
    );

  const regionData =
    allProviders.IN && hasProviders(allProviders.IN)
      ? allProviders.IN
      : allProviders.US && hasProviders(allProviders.US)
        ? allProviders.US
        : null;

  if (!regionData) return null;

  const mapProvider = (p: { provider_id: number; provider_name: string; logo_path: string }) => ({
    id: p.provider_id,
    name: p.provider_name,
    logoPath: `https://image.tmdb.org/t/p/w92${p.logo_path}`,
  });

  const stream = (regionData.flatrate || []).map(mapProvider);
  const rent = (regionData.rent || []).map(mapProvider);
  const buy = (regionData.buy || []).map(mapProvider);

  if (stream.length === 0 && rent.length === 0 && buy.length === 0) return null;
  return { stream, rent, buy, attribution: "Data by JustWatch" };
}

/**
 * Fetches and normalizes Movie or TV Series details from TMDB alongside DB friends activity.
 */
export async function getTmdbMediaDetails(
  type: "movie" | "tv",
  id: string,
  externalId: string,
  currentUserId?: string | null,
): Promise<MediaDetails | null> {
  const tmdbEndpoint = `/${type}/${id}?append_to_response=videos,credits,images,recommendations,watch/providers,release_dates,content_ratings&include_image_language=en,null`;

  const [tmdbSettled, squadSettled] = await Promise.allSettled([
    tmdbFetch(tmdbEndpoint, { next: { revalidate: 3600 } }),
    fetchFriendsActivity(externalId, currentUserId),
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
  const releaseYear = dateStr ? parseInt(dateStr.slice(0, 4), 10) || null : null;
  const posterUrl = tmdbData.poster_path
    ? `https://image.tmdb.org/t/p/w780${tmdbData.poster_path}`
    : null;
  const backdropUrl = selectTmdbBackdrop(tmdbData.images, tmdbData.backdrop_path);
  const creator =
    tmdbData.credits?.crew?.find((c: { job: string; name: string }) => c.job === "Director")
      ?.name ||
    tmdbData.created_by?.[0]?.name ||
    null;

  syncMediaImages(savedItem, posterUrl, backdropUrl);

  const cast: CastMember[] = (tmdbData.credits?.cast || [])
    .slice(0, 8)
    .map((c: { id: number; name: string; character: string; profile_path: string | null }) => ({
      id: c.id,
      name: c.name,
      character: c.character,
      profileUrl: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
      profilePath: c.profile_path || null,
    }));

  const { directors, writers, composers, composer } = extractTmdbCrew(tmdbData.credits?.crew || []);

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
          releaseYear: recDate ? parseInt(recDate.slice(0, 4), 10) || null : null,
          rating: r.vote_average ? Math.round(r.vote_average * 10) / 10 : null,
        };
      },
    );

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
            releaseYear: p.release_date ? parseInt(p.release_date.slice(0, 4), 10) || null : null,
            rating: p.vote_average ? Math.round(p.vote_average * 10) / 10 : null,
            isCurrent: p.id === Number(id),
          }),
        );
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

  let tvSeasons: TvSeason[] | undefined;
  let tvNextEpisode: TvNextEpisode | null = null;
  if (type === "tv") {
    if (Array.isArray(tmdbData.seasons)) {
      tvSeasons = tmdbData.seasons
        .filter((s: { season_number: number }) => s.season_number > 0)
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

  return {
    id: savedItem?.id || externalId,
    externalId,
    mediaType: type,
    title,
    releaseYear,
    posterUrl,
    backdropUrl,
    summary: tmdbData.overview || null,
    tagline: tmdbData.tagline?.trim() || null,
    genres: tmdbData.genres?.map((g: { name: string }) => g.name) || [],
    creator,
    trailerUrl: selectTmdbTrailer(tmdbData.videos?.results),
    status: formatSentenceCase(tmdbData.status),
    runtimeMinutes:
      type === "movie" && typeof tmdbData.runtime === "number" && tmdbData.runtime > 0
        ? tmdbData.runtime
        : null,
    seasonsCount:
      type === "tv" && typeof tmdbData.number_of_seasons === "number"
        ? tmdbData.number_of_seasons
        : null,
    episodesCount:
      type === "tv" && typeof tmdbData.number_of_episodes === "number"
        ? tmdbData.number_of_episodes
        : null,
    ageRating: extractTmdbAgeRating(type, tmdbData),
    externalScore:
      typeof tmdbData.vote_average === "number" && tmdbData.vote_average > 0
        ? Math.round(tmdbData.vote_average * 10) / 10
        : null,
    squadEntries,
    squadRatingAverage: computeFriendsRatingAverage(squadEntries),
    watchProviders: extractWatchProviders(tmdbData["watch/providers"]?.results),
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
