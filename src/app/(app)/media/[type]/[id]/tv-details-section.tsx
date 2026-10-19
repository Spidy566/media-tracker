import { Calendar } from "lucide-react";
import type { TvNextEpisode, TvSeason } from "@/types/media-details";

interface TvDetailsSectionProps {
  tvNextEpisode?: TvNextEpisode | null;
  tvSeasons?: TvSeason[];
}

export function TvDetailsSection({ tvNextEpisode, tvSeasons }: TvDetailsSectionProps) {
  const hasNext = Boolean(tvNextEpisode);
  const hasSeasons = tvSeasons && tvSeasons.length > 0;

  if (!hasNext && !hasSeasons) return null;

  return (
    <div className="space-y-4">
      {/* Next episode to air */}
      {tvNextEpisode && (
        <div className="bg-card border border-border rounded-2xl p-5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
            <Calendar className="size-3.5 text-status-queue" />
            <span>Next episode to air</span>
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">
                Season {tvNextEpisode.seasonNumber}, Episode {tvNextEpisode.episodeNumber}
              </span>
              {tvNextEpisode.airDate && (
                <>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-muted-foreground">{tvNextEpisode.airDate}</span>
                </>
              )}
            </div>

            {tvNextEpisode.name && (
              <span className="text-foreground/90 block font-medium">
                &ldquo;{tvNextEpisode.name}&rdquo;
              </span>
            )}

            {tvNextEpisode.overview && (
              <p className="text-muted-foreground text-xs leading-relaxed pt-1 max-w-2xl">
                {tvNextEpisode.overview}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Seasons list with episode counts */}
      {hasSeasons && (
        <div className="space-y-2.5 bg-card border border-border rounded-2xl p-5 shadow-2xs">
          <h3 className="text-xs font-semibold text-foreground">Seasons</h3>
          <div className="flex flex-wrap gap-2">
            {tvSeasons.map((s) => (
              <div
                key={s.id}
                className="px-3 py-1.5 rounded-xl bg-background border border-border text-xs flex items-center gap-1.5 shadow-2xs"
              >
                <span className="font-medium text-foreground">{s.name}</span>
                <span className="text-muted-foreground text-[11px]">
                  ({s.episodeCount} {s.episodeCount === 1 ? "ep" : "eps"})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
