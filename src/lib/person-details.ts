import { tmdbFetch } from "@/lib/tmdb";

// --- Types ---

export interface PersonCastCredit {
  externalId: string;
  mediaType: "movie" | "tv";
  title: string;
  year: number | null;
  posterPath: string | null;
  character: string;
  popularity: number;
  voteCount: number;
  genreIds: number[];
  episodeCount?: number;
  isFiltered?: boolean;
}

export interface PersonCrewCredit {
  externalId: string;
  mediaType: "movie" | "tv";
  title: string;
  year: number | null;
  posterPath: string | null;
  job: string;
  popularity: number;
  voteCount: number;
  genreIds: number[];
  isFiltered?: boolean;
}

export interface PersonCrewGroup {
  department: string;
  credits: PersonCrewCredit[];
}

export interface PersonKnownForCredit {
  externalId: string;
  mediaType: "movie" | "tv";
  title: string;
  year: number | null;
  posterPath: string | null;
  character?: string;
  job?: string;
  popularity: number;
  voteCount: number;
}

export interface PersonDetails {
  id: number;
  name: string;
  knownForDepartment: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  biography: string | null;
  profilePath: string | null;
  externalIds: {
    imdbId: string | null;
    facebookId: string | null;
    instagramId: string | null;
    twitterId: string | null;
  };
  castCredits: PersonCastCredit[];
  crewGroups: PersonCrewGroup[];
  knownFor: PersonKnownForCredit[];
  hiddenCount: number;
}

// --- Filtering & Music constants ---

const SELF_REGEX = /self|himself|herself|archive footage|uncredited/i;
const EXCLUDED_TV_GENRES = new Set([10767, 10763, 10764]); // Talk, News, Reality
const EXCLUDED_JOBS = new Set(["Thanks", "Special Thanks"]);

const MUSIC_JOBS = new Set([
  "Original Music Composer",
  "Music",
  "Composer",
  "Songs",
  "Theme Song Performance",
  "Soundtrack",
  "Music Supervisor",
  "Music Department",
]);

const musicJobPriority: Record<string, number> = {
  "Original Music Composer": 6,
  Composer: 5,
  Songs: 4,
  "Theme Song Performance": 3,
  Music: 2,
  Soundtrack: 1,
  "Music Supervisor": 2,
  "Music Department": 1,
};

function shouldExcludeCredit(
  character: string,
  mediaType: "movie" | "tv",
  genreIds: number[],
): boolean {
  if (SELF_REGEX.test(character)) return true;
  if (mediaType === "tv" && genreIds.some((g) => EXCLUDED_TV_GENRES.has(g))) return true;
  return false;
}

function getJobPriority(job?: string): number {
  if (!job) return 0;
  if (job === "Director") return 100;
  if (job === "Creator") return 95;
  if (["Writer", "Screenplay", "Story"].includes(job)) return 90;
  if (job.includes("Original Music Composer") || job === "Composer") return 85;
  if (job.includes("Music") || job.includes("Songs")) return 82;
  if (job === "Producer") return 80;
  if (job === "Executive Producer") return 70;
  return 50;
}

// --- Main ---

export async function getPersonDetails(id: number): Promise<PersonDetails | null> {
  let data: Record<string, unknown>;
  try {
    data = await tmdbFetch(`/person/${id}?append_to_response=combined_credits,external_ids`, {
      next: { revalidate: 86400 },
    });
  } catch {
    return null;
  }

  if (!data?.id) return null;

  const name = (data.name as string) || "Unknown";
  const knownForDepartment = (data.known_for_department as string) || null;
  const birthday = (data.birthday as string) || null;
  const deathday = (data.deathday as string) || null;
  const placeOfBirth = (data.place_of_birth as string) || null;
  const biography = (data.biography as string) || null;
  const profilePath = (data.profile_path as string) || null;

  const extIds = data.external_ids as Record<string, unknown> | undefined;
  const externalIds = {
    imdbId: (extIds?.imdb_id as string) || null,
    facebookId: (extIds?.facebook_id as string) || null,
    instagramId: (extIds?.instagram_id as string) || null,
    twitterId: (extIds?.twitter_id as string) || null,
  };

  // --- Credits ---
  const combinedCredits = data.combined_credits as
    | {
        cast?: Array<Record<string, unknown>>;
        crew?: Array<Record<string, unknown>>;
      }
    | undefined;

  const rawCast: Array<Record<string, unknown>> = combinedCredits?.cast || [];
  const rawCrew: Array<Record<string, unknown>> = combinedCredits?.crew || [];

  // 1. Process Cast
  const castSeen = new Set<string>();
  const allCastCredits: PersonCastCredit[] = [];
  let hiddenCount = 0;

  for (const c of rawCast) {
    const mt = c.media_type as string;
    if (mt !== "movie" && mt !== "tv") continue;
    const tmdbId = c.id as number;
    const key = `${mt}:${tmdbId}`;
    if (castSeen.has(key)) continue;
    castSeen.add(key);

    const dateStr = (c.release_date || c.first_air_date) as string | undefined;
    const character = (c.character as string) || "";
    const genreIds = (c.genre_ids as number[]) || [];
    const isFiltered = shouldExcludeCredit(character, mt as "movie" | "tv", genreIds);

    const credit: PersonCastCredit = {
      externalId: `tmdb:${mt}:${tmdbId}`,
      mediaType: mt as "movie" | "tv",
      title: (c.title || c.name || "Untitled") as string,
      year: dateStr ? parseInt(dateStr.slice(0, 4), 10) || null : null,
      posterPath: (c.poster_path as string) || null,
      character,
      popularity: (c.popularity as number) || 0,
      voteCount: (c.vote_count as number) || 0,
      genreIds,
      episodeCount: (c.episode_count as number) || undefined,
      isFiltered,
    };

    allCastCredits.push(credit);
    if (isFiltered) {
      hiddenCount++;
    }
  }

  // 2. Process Crew grouped by department (excluding music and sound)
  const crewByDept = new Map<string, PersonCrewCredit[]>();
  const crewSeen = new Map<string, Set<string>>(); // dept -> set of keys
  const allCrewCredits: PersonCrewCredit[] = [];

  for (const c of rawCrew) {
    const mt = c.media_type as string;
    if (mt !== "movie" && mt !== "tv") continue;
    const tmdbId = c.id as number;
    const dept = (c.department as string) || "Other";
    const job = (c.job as string) || dept;

    // Music jobs and Sound dept are processed into dedicated Music group
    if (dept === "Sound" || MUSIC_JOBS.has(job)) continue;

    const key = `${mt}:${tmdbId}`;
    if (!crewSeen.has(dept)) crewSeen.set(dept, new Set());
    if (crewSeen.get(dept)?.has(key)) continue;
    crewSeen.get(dept)?.add(key);

    const dateStr = (c.release_date || c.first_air_date) as string | undefined;
    const genreIds = (c.genre_ids as number[]) || [];
    const isFiltered = mt === "tv" && genreIds.some((g) => EXCLUDED_TV_GENRES.has(g));

    const credit: PersonCrewCredit = {
      externalId: `tmdb:${mt}:${tmdbId}`,
      mediaType: mt as "movie" | "tv",
      title: (c.title || c.name || "Untitled") as string,
      year: dateStr ? parseInt(dateStr.slice(0, 4), 10) || null : null,
      posterPath: (c.poster_path as string) || null,
      job,
      popularity: (c.popularity as number) || 0,
      voteCount: (c.vote_count as number) || 0,
      genreIds,
      isFiltered,
    };

    allCrewCredits.push(credit);
    if (isFiltered) {
      hiddenCount++;
    }

    if (!crewByDept.has(dept)) crewByDept.set(dept, []);
    crewByDept.get(dept)?.push(credit);
  }

  // 3. Process Music group
  // Deduplicate by media type plus id and join job labels in card subtitle (e.g. "Original score · Songs")
  const musicMap = new Map<
    string,
    { credit: PersonCrewCredit; jobs: string[]; priorities: number[] }
  >();

  for (const c of rawCrew) {
    const job = (c.job as string) || "";
    if (!MUSIC_JOBS.has(job)) continue;
    const mt = c.media_type as string;
    if (mt !== "movie" && mt !== "tv") continue;
    const tmdbId = c.id as number;
    const key = `${mt}:${tmdbId}`;

    const dateStr = (c.release_date || c.first_air_date) as string | undefined;
    const genreIds = (c.genre_ids as number[]) || [];
    const isFiltered = mt === "tv" && genreIds.some((g) => EXCLUDED_TV_GENRES.has(g));

    if (!musicMap.has(key)) {
      const credit: PersonCrewCredit = {
        externalId: `tmdb:${mt}:${tmdbId}`,
        mediaType: mt as "movie" | "tv",
        title: (c.title || c.name || "Untitled") as string,
        year: dateStr ? parseInt(dateStr.slice(0, 4), 10) || null : null,
        posterPath: (c.poster_path as string) || null,
        job,
        popularity: (c.popularity as number) || 0,
        voteCount: (c.vote_count as number) || 0,
        genreIds,
        isFiltered,
      };
      musicMap.set(key, { credit, jobs: [job], priorities: [musicJobPriority[job] || 0] });
    } else {
      const existing = musicMap.get(key);
      if (existing) {
        if (!existing.jobs.includes(job)) {
          existing.jobs.push(job);
          existing.priorities.push(musicJobPriority[job] || 0);
        }
        if (!isFiltered) {
          existing.credit.isFiltered = false;
        }
        if (((c.vote_count as number) || 0) > existing.credit.voteCount) {
          existing.credit.voteCount = (c.vote_count as number) || 0;
          existing.credit.popularity = (c.popularity as number) || 0;
        }
      }
    }
  }

  const musicCredits: PersonCrewCredit[] = [];
  for (const item of musicMap.values()) {
    // Sort jobs so most specific comes first, e.g. "Original Music Composer · Songs"
    const paired = item.jobs.map((j, idx) => ({ job: j, p: item.priorities[idx] }));
    paired.sort((a, b) => b.p - a.p);
    item.credit.job = paired.map((p) => p.job).join(" · ");
    musicCredits.push(item.credit);
    allCrewCredits.push(item.credit);
    if (item.credit.isFiltered) {
      hiddenCount++;
    }
  }

  // Core & threshold departments
  const coreDepts = new Set(["Directing", "Writing", "Production"]);
  const crewGroups: PersonCrewGroup[] = [];
  for (const [dept, credits] of crewByDept) {
    if (credits.length >= 3 || coreDepts.has(dept)) {
      crewGroups.push({ department: dept, credits });
    }
  }

  // Add Music group if credits exist
  if (musicCredits.length > 0) {
    crewGroups.push({ department: "Music", credits: musicCredits });
  }

  // 4. Known for: top 8 from cleaned credits across all tabs
  const knownForMap = new Map<string, PersonKnownForCredit>();
  const isActor = knownForDepartment === "Acting";

  // Filter cleaned credits
  const cleanedCast = allCastCredits.filter((c) => !c.isFiltered && c.posterPath);
  const cleanedCrew = allCrewCredits.filter(
    (c) => !c.isFiltered && c.posterPath && !EXCLUDED_JOBS.has(c.job),
  );

  // If actor, look at crew then cast (so cast role wins); if director/writer/composer, look at cast then crew
  const firstPass = isActor ? cleanedCrew : cleanedCast;
  const secondPass = isActor ? cleanedCast : cleanedCrew;

  for (const item of [...firstPass, ...secondPass]) {
    const key = item.externalId;
    const existing = knownForMap.get(key);
    const itemJob = "job" in item ? (item as PersonCrewCredit).job : undefined;
    const itemChar = "character" in item ? (item as PersonCastCredit).character : undefined;

    if (!existing) {
      knownForMap.set(key, {
        externalId: item.externalId,
        mediaType: item.mediaType,
        title: item.title,
        year: item.year,
        posterPath: item.posterPath,
        character: itemChar,
        job: itemJob,
        popularity: item.popularity,
        voteCount: item.voteCount,
      });
    } else {
      const existingJobPriority = getJobPriority(existing.job);
      const newJobPriority = getJobPriority(itemJob);
      if (newJobPriority > existingJobPriority) {
        existing.job = itemJob;
        existing.character = itemChar;
      }
      if (item.voteCount > existing.voteCount) {
        existing.voteCount = item.voteCount;
        existing.popularity = item.popularity;
      }
    }
  }

  const knownFor = [...knownForMap.values()]
    .sort((a, b) => {
      const scoreB = b.voteCount * Math.log10(b.popularity + 2);
      const scoreA = a.voteCount * Math.log10(a.popularity + 2);
      if (scoreB !== scoreA) {
        return scoreB - scoreA;
      }
      return b.popularity - a.popularity;
    })
    .slice(0, 8);

  // Fallback if needed: if knownFor has fewer than 8, populate with top popularity across all tabs
  if (knownFor.length < 8) {
    const allUnique = [...allCastCredits, ...allCrewCredits].filter((c) => c.posterPath);
    const fallbackSorted = allUnique.sort((a, b) => b.popularity - a.popularity);
    const seenIds = new Set(knownFor.map((k) => k.externalId));
    for (const item of fallbackSorted) {
      if (knownFor.length >= 8) break;
      if (!seenIds.has(item.externalId)) {
        seenIds.add(item.externalId);
        knownFor.push({
          externalId: item.externalId,
          mediaType: item.mediaType,
          title: item.title,
          year: item.year,
          posterPath: item.posterPath,
          character: "character" in item ? item.character : undefined,
          job: "job" in item ? item.job : undefined,
          popularity: item.popularity,
          voteCount: item.voteCount,
        });
      }
    }
  }

  return {
    id,
    name,
    knownForDepartment,
    birthday,
    deathday,
    placeOfBirth,
    biography,
    profilePath,
    externalIds,
    castCredits: allCastCredits,
    crewGroups,
    knownFor,
    hiddenCount,
  };
}
