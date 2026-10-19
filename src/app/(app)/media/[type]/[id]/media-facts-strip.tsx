import type { MediaDetails } from "@/types/media-details";

interface MediaFactsStripProps {
  details: MediaDetails;
}

function formatRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatSeasons(seasons: number, episodes: number | null): string {
  const seasonStr = `${seasons} ${seasons === 1 ? "season" : "seasons"}`;
  if (episodes && episodes > 0) {
    return `${seasonStr} · ${episodes} episodes`;
  }
  return seasonStr;
}

export function MediaFactsStrip({ details }: MediaFactsStripProps) {
  const facts: Array<{
    id: string;
    label: string;
    isScore?: boolean;
    scoreNum?: number;
    source?: string;
  }> = [];

  // 1. Runtime (movies) or Seasons (TV)
  if (details.mediaType === "movie" && details.runtimeMinutes) {
    facts.push({
      id: "runtime",
      label: formatRuntime(details.runtimeMinutes),
    });
  } else if (details.mediaType === "tv" && details.seasonsCount) {
    facts.push({
      id: "seasons",
      label: formatSeasons(details.seasonsCount, details.episodesCount),
    });
  }

  // 2. Age Rating
  if (details.ageRating) {
    facts.push({
      id: "age-rating",
      label: details.ageRating,
    });
  }

  // 3. Status
  if (details.status) {
    facts.push({
      id: "status",
      label: details.status,
    });
  }

  // 4. External Score
  if (details.externalScore !== null) {
    const source = details.mediaType === "game" ? "IGDB" : "TMDB";
    facts.push({
      id: "external-score",
      label: `${details.externalScore}`,
      isScore: true,
      scoreNum: details.externalScore,
      source,
    });
  }

  if (facts.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
      {facts.map((fact) => {
        if (fact.isScore) {
          return (
            <span
              key={fact.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-foreground font-medium shadow-2xs"
            >
              <span className="text-rating">★</span>
              <span className="font-mono font-semibold">{fact.scoreNum}</span>
              <span className="text-muted-foreground">{fact.source}</span>
            </span>
          );
        }

        return (
          <span
            key={fact.id}
            className="inline-flex items-center px-2.5 py-1 rounded-full bg-card border border-border text-muted-foreground font-medium shadow-2xs"
          >
            {fact.label}
          </span>
        );
      })}
    </div>
  );
}
