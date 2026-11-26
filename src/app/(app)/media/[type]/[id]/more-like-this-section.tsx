"use client";

import { useState } from "react";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import { ScrollRow } from "@/components/scroll-row";
import { useEntryMutations } from "@/hooks/use-entry-mutations";
import { getMediaHref } from "@/lib/utils";
import type { RecommendationItem } from "@/types/media-details";

interface MoreLikeThisSectionProps {
  recommendations: RecommendationItem[];
}

export function MoreLikeThisSection({ recommendations }: MoreLikeThisSectionProps) {
  // Local state for tracking quick statuses added during session
  const [localStatuses, setLocalStatuses] = useState<Record<string, MediaStatus>>({});

  const { logEntry } = useEntryMutations({
    onLogSuccess: (_, variables) => {
      setLocalStatuses((prev) => ({
        ...prev,
        [variables.media.externalId]: variables.status,
      }));
    },
  });

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <ScrollRow
      title={
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          More like this
        </h3>
      }
      action={
        <span className="text-[11px] text-muted-foreground font-mono">
          {recommendations.length} titles
        </span>
      }
      contentClassName="gap-3"
    >
      {recommendations.map((item) => (
        <div key={item.externalId} className="w-32 sm:w-36 shrink-0 snap-start">
          <MediaCard
            title={item.title}
            mediaType={item.mediaType}
            posterUrl={item.posterUrl}
            releaseYear={item.releaseYear}
            currentStatus={localStatuses[item.externalId] || null}
            href={getMediaHref(item)}
            onQuickStatus={(status) =>
              logEntry({
                media: {
                  externalId: item.externalId,
                  mediaType: item.mediaType,
                  title: item.title,
                  releaseYear: item.releaseYear,
                  posterUrl: item.posterUrl,
                  backdropUrl: item.backdropUrl,
                },
                status,
              })
            }
          />
        </div>
      ))}
    </ScrollRow>
  );
}
