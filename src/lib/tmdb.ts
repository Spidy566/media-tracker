import { env } from "@/lib/env";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function tmdbFetch(endpoint: string, options?: RequestInit | number, retries = 2) {
  const init: RequestInit = typeof options === "object" && options !== null ? options : {};
  const retryCount = typeof options === "number" ? options : retries;
  const apiKey = env.TMDB_API_KEY;

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const res = await fetch(`${TMDB_BASE_URL}${endpoint}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
          ...init.headers,
        },
      });

      if (!res.ok) {
        throw new Error(`TMDB API error: ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      if (attempt === retryCount) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  throw new Error("Failed to fetch TMDB data");
}

export interface TmdbVideoItem {
  key: string;
  site: string;
  type: string;
  name?: string;
  official?: boolean;
  published_at?: string;
}

const EXCLUDED_PROMO_REGEX =
  /asmr|own now|buy now|digital|home entertainment|tv spot|clip|featurette|behind the scenes|recap/i;

export function selectTmdbTrailer(videos: TmdbVideoItem[] | undefined | null): string | null {
  if (!videos || !Array.isArray(videos)) return null;

  const youtubeVideos = videos.filter((v) => v.site === "YouTube" && v.key);

  const filterAndRank = (type: "Trailer" | "Teaser") => {
    const candidates = youtubeVideos.filter(
      (v) => v.type === type && !EXCLUDED_PROMO_REGEX.test(v.name || ""),
    );

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
      // 1. official === true
      const aOfficial = a.official ? 1 : 0;
      const bOfficial = b.official ? 1 : 0;
      if (bOfficial !== aOfficial) return bOfficial - aOfficial;

      // 2. Name contains "Official Trailer" or "Main Trailer"
      const isPriorityName = (name: string = "") =>
        /official trailer|main trailer/i.test(name) ? 1 : 0;
      const aNamePriority = isPriorityName(a.name);
      const bNamePriority = isPriorityName(b.name);
      if (bNamePriority !== aNamePriority) return bNamePriority - aNamePriority;

      // 3. Oldest published_at (the original launch trailer, not a later promo)
      const aDate = a.published_at ? new Date(a.published_at).getTime() : Number.POSITIVE_INFINITY;
      const bDate = b.published_at ? new Date(b.published_at).getTime() : Number.POSITIVE_INFINITY;
      return aDate - bDate;
    });

    return `https://www.youtube.com/embed/${candidates[0].key}`;
  };

  return filterAndRank("Trailer") || filterAndRank("Teaser") || null;
}

export interface TmdbBackdropItem {
  file_path: string;
  width: number;
  height: number;
  iso_639_1: string | null;
  vote_average?: number;
  vote_count?: number;
}

export interface TmdbImagesData {
  backdrops?: TmdbBackdropItem[];
}

export function selectTmdbBackdrop(
  images?: TmdbImagesData | null,
  fallbackPath?: string | null,
): string | null {
  const backdrops = images?.backdrops;
  if (backdrops && Array.isArray(backdrops) && backdrops.length > 0) {
    // 1. Textless backdrops with width >= 1920
    const textless = backdrops.filter(
      (b) => b.file_path && b.iso_639_1 === null && b.width >= 1920,
    );
    if (textless.length > 0) {
      textless.sort((a, b) => {
        const voteDiff = (b.vote_average ?? 0) - (a.vote_average ?? 0);
        if (voteDiff !== 0) return voteDiff;
        return (b.vote_count ?? 0) - (a.vote_count ?? 0);
      });
      const cleanPath = textless[0].file_path.startsWith("/")
        ? textless[0].file_path
        : `/${textless[0].file_path}`;
      return `https://image.tmdb.org/t/p/original${cleanPath}`;
    }

    // 2. Any backdrop with width >= 1920 (ignore language)
    const anyHighRes = backdrops.filter((b) => b.file_path && b.width >= 1920);
    if (anyHighRes.length > 0) {
      anyHighRes.sort((a, b) => {
        const voteDiff = (b.vote_average ?? 0) - (a.vote_average ?? 0);
        if (voteDiff !== 0) return voteDiff;
        return (b.vote_count ?? 0) - (a.vote_count ?? 0);
      });
      const cleanPath = anyHighRes[0].file_path.startsWith("/")
        ? anyHighRes[0].file_path
        : `/${anyHighRes[0].file_path}`;
      return `https://image.tmdb.org/t/p/original${cleanPath}`;
    }
  }

  // 3. Fall back to fallbackPath (backdrop_path), never use the poster
  if (fallbackPath) {
    const cleanPath = fallbackPath.startsWith("/") ? fallbackPath : `/${fallbackPath}`;
    return `https://image.tmdb.org/t/p/original${cleanPath}`;
  }

  return null;
}
