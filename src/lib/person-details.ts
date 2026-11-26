import { tmdbFetch } from "@/lib/tmdb";
import type {
  PersonCastCredit,
  PersonCrewCredit,
  PersonCrewGroup,
  PersonDetails,
  PersonKnownForCredit,
} from "@/types/person";

export type {
  PersonCastCredit,
  PersonCrewCredit,
  PersonCrewGroup,
  PersonDetails,
  PersonKnownForCredit,
};

type RawCredit = Record<string, unknown>;

const SELF_REGEX = /self|himself|herself|archive footage|uncredited/i;
const EXCLUDED_TV_GENRES = new Set([10767, 10763, 10764]); // Talk, News, Reality
const EXCLUDED_JOBS = new Set(["Thanks", "Special Thanks"]);
const CORE_DEPARTMENTS = new Set(["Directing", "Writing", "Production"]);

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

const MUSIC_JOB_PRIORITY: Record<string, number> = {
  "Original Music Composer": 6,
  Composer: 5,
  Songs: 4,
  "Theme Song Performance": 3,
  Music: 2,
  Soundtrack: 1,
  "Music Supervisor": 2,
  "Music Department": 1,
};

function isExcludedTvGenre(mediaType: "movie" | "tv", genreIds: number[]): boolean {
  return mediaType === "tv" && genreIds.some((g) => EXCLUDED_TV_GENRES.has(g));
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

function buildBaseCredit(raw: RawCredit, mediaType: "movie" | "tv", isFiltered: boolean) {
  const dateStr = (raw.release_date || raw.first_air_date) as string | undefined;
  return {
    externalId: `tmdb:${mediaType}:${raw.id as number}`,
    mediaType,
    title: (raw.title || raw.name || "Untitled") as string,
    year: dateStr ? Number.parseInt(dateStr.slice(0, 4), 10) || null : null,
    posterPath: (raw.poster_path as string) || null,
    popularity: (raw.popularity as number) || 0,
    voteCount: (raw.vote_count as number) || 0,
    genreIds: (raw.genre_ids as number[]) || [],
    isFiltered,
  };
}

function processCastCredits(rawCast: RawCredit[]): {
  castCredits: PersonCastCredit[];
  hiddenCount: number;
} {
  const seen = new Set<string>();
  const castCredits: PersonCastCredit[] = [];
  let hiddenCount = 0;

  for (const raw of rawCast) {
    const mt = raw.media_type as string;
    if (mt !== "movie" && mt !== "tv") continue;

    const key = `${mt}:${raw.id as number}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const character = (raw.character as string) || "";
    const genreIds = (raw.genre_ids as number[]) || [];
    const isFiltered = SELF_REGEX.test(character) || isExcludedTvGenre(mt, genreIds);

    castCredits.push({
      ...buildBaseCredit(raw, mt, isFiltered),
      character,
      episodeCount: (raw.episode_count as number) || undefined,
    });
    if (isFiltered) hiddenCount++;
  }

  return { castCredits, hiddenCount };
}

function processCrewCredits(rawCrew: RawCredit[]): {
  crewGroups: PersonCrewGroup[];
  allCrewCredits: PersonCrewCredit[];
  hiddenCount: number;
} {
  const crewByDept = new Map<string, PersonCrewCredit[]>();
  const crewSeen = new Map<string, Set<string>>();
  const allCrewCredits: PersonCrewCredit[] = [];
  const musicMap = new Map<
    string,
    { credit: PersonCrewCredit; jobs: string[]; priorities: number[] }
  >();
  let hiddenCount = 0;

  for (const raw of rawCrew) {
    const mt = raw.media_type as string;
    if (mt !== "movie" && mt !== "tv") continue;

    const dept = (raw.department as string) || "Other";
    const job = (raw.job as string) || dept;
    const key = `${mt}:${raw.id as number}`;
    const genreIds = (raw.genre_ids as number[]) || [];
    const isFiltered = isExcludedTvGenre(mt, genreIds);

    // Music jobs are consolidated into a single Music group with combined job labels
    if (MUSIC_JOBS.has(job)) {
      const existing = musicMap.get(key);
      if (!existing) {
        musicMap.set(key, {
          credit: { ...buildBaseCredit(raw, mt, isFiltered), job },
          jobs: [job],
          priorities: [MUSIC_JOB_PRIORITY[job] || 0],
        });
      } else {
        if (!existing.jobs.includes(job)) {
          existing.jobs.push(job);
          existing.priorities.push(MUSIC_JOB_PRIORITY[job] || 0);
        }
        if (!isFiltered) existing.credit.isFiltered = false;
        const votes = (raw.vote_count as number) || 0;
        if (votes > existing.credit.voteCount) {
          existing.credit.voteCount = votes;
          existing.credit.popularity = (raw.popularity as number) || 0;
        }
      }
      continue;
    }

    if (dept === "Sound") continue;
    if (!crewSeen.has(dept)) crewSeen.set(dept, new Set());
    if (crewSeen.get(dept)?.has(key)) continue;
    crewSeen.get(dept)?.add(key);

    const credit: PersonCrewCredit = { ...buildBaseCredit(raw, mt, isFiltered), job };
    allCrewCredits.push(credit);
    if (isFiltered) hiddenCount++;

    if (!crewByDept.has(dept)) crewByDept.set(dept, []);
    crewByDept.get(dept)?.push(credit);
  }

  const musicCredits: PersonCrewCredit[] = [];
  for (const item of musicMap.values()) {
    const paired = item.jobs
      .map((j, idx) => ({ job: j, p: item.priorities[idx] }))
      .sort((a, b) => b.p - a.p);
    item.credit.job = paired.map((p) => p.job).join(" · ");
    musicCredits.push(item.credit);
    allCrewCredits.push(item.credit);
    if (item.credit.isFiltered) hiddenCount++;
  }

  const crewGroups: PersonCrewGroup[] = [];
  for (const [dept, credits] of crewByDept) {
    if (credits.length >= 3 || CORE_DEPARTMENTS.has(dept)) {
      crewGroups.push({ department: dept, credits });
    }
  }
  if (musicCredits.length > 0) {
    crewGroups.push({ department: "Music", credits: musicCredits });
  }

  return { crewGroups, allCrewCredits, hiddenCount };
}

function buildKnownForCredits(
  allCastCredits: PersonCastCredit[],
  allCrewCredits: PersonCrewCredit[],
  knownForDepartment: string | null,
): PersonKnownForCredit[] {
  const knownForMap = new Map<string, PersonKnownForCredit>();
  const isActor = knownForDepartment === "Acting";
  const cleanedCast = allCastCredits.filter((c) => !c.isFiltered && c.posterPath);
  const cleanedCrew = allCrewCredits.filter(
    (c) => !c.isFiltered && c.posterPath && !EXCLUDED_JOBS.has(c.job),
  );

  // Actors prioritize cast roles; directors/writers/composers prioritize crew roles
  const orderedPasses = isActor
    ? [...cleanedCrew, ...cleanedCast]
    : [...cleanedCast, ...cleanedCrew];

  for (const item of orderedPasses) {
    const existing = knownForMap.get(item.externalId);
    const itemJob = "job" in item ? item.job : undefined;
    const itemChar = "character" in item ? item.character : undefined;

    if (!existing) {
      knownForMap.set(item.externalId, {
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
      continue;
    }

    if (getJobPriority(itemJob) > getJobPriority(existing.job)) {
      existing.job = itemJob;
      existing.character = itemChar;
    }
    if (item.voteCount > existing.voteCount) {
      existing.voteCount = item.voteCount;
      existing.popularity = item.popularity;
    }
  }

  const knownFor = [...knownForMap.values()]
    .sort((a, b) => {
      const scoreB = b.voteCount * Math.log10(b.popularity + 2);
      const scoreA = a.voteCount * Math.log10(a.popularity + 2);
      return scoreB !== scoreA ? scoreB - scoreA : b.popularity - a.popularity;
    })
    .slice(0, 8);

  if (knownFor.length < 8) {
    const seenIds = new Set(knownFor.map((k) => k.externalId));
    const fallback = [...allCastCredits, ...allCrewCredits]
      .filter((c) => c.posterPath)
      .sort((a, b) => b.popularity - a.popularity);

    for (const item of fallback) {
      if (knownFor.length >= 8) break;
      if (seenIds.has(item.externalId)) continue;
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

  return knownFor;
}

/** Fetch and normalize a person's biography, credits, and "Known For" highlights from TMDB. */
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

  const extIds = data.external_ids as Record<string, unknown> | undefined;
  const combinedCredits = data.combined_credits as
    | { cast?: RawCredit[]; crew?: RawCredit[] }
    | undefined;

  const knownForDepartment = (data.known_for_department as string) || null;
  const { castCredits, hiddenCount: castHidden } = processCastCredits(combinedCredits?.cast || []);
  const {
    crewGroups,
    allCrewCredits,
    hiddenCount: crewHidden,
  } = processCrewCredits(combinedCredits?.crew || []);

  return {
    id,
    name: (data.name as string) || "Unknown",
    knownForDepartment,
    birthday: (data.birthday as string) || null,
    deathday: (data.deathday as string) || null,
    placeOfBirth: (data.place_of_birth as string) || null,
    biography: (data.biography as string) || null,
    profilePath: (data.profile_path as string) || null,
    externalIds: {
      imdbId: (extIds?.imdb_id as string) || null,
      facebookId: (extIds?.facebook_id as string) || null,
      instagramId: (extIds?.instagram_id as string) || null,
      twitterId: (extIds?.twitter_id as string) || null,
    },
    castCredits,
    crewGroups,
    knownFor: buildKnownForCredits(castCredits, allCrewCredits, knownForDepartment),
    hiddenCount: castHidden + crewHidden,
  };
}
