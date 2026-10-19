"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import { ScrollRow } from "@/components/scroll-row";
import { logEntryApi } from "@/lib/api-entries";
import type { RecommendationItem } from "@/types/media-details";

interface MoreLikeThisSectionProps {
  recommendations: RecommendationItem[];
}

function getStatusVerb(status: string) {
  switch (status) {
    case "done":
      return "finished";
    case "doing":
      return "started";
    case "want_to":
      return "queued";
    default:
      return "logged";
  }
}

export function MoreLikeThisSection({ recommendations }: MoreLikeThisSectionProps) {
  const router = useRouter();

  // Local state for tracking quick statuses added during session
  const [localStatuses, setLocalStatuses] = useState<Record<string, MediaStatus>>({});

  const { mutate: setQuickStatus } = useMutation({
    mutationFn: async ({
      item,
      status,
    }: {
      item: RecommendationItem;
      status: "want_to" | "doing" | "done";
    }) => {
      return logEntryApi({
        media: {
          externalId: item.externalId,
          mediaType: item.mediaType,
          title: item.title,
          releaseYear: item.releaseYear,
          posterUrl: item.posterUrl,
          backdropUrl: item.backdropUrl,
        },
        status,
      });
    },
    onSuccess: (_, variables) => {
      setLocalStatuses((prev) => ({
        ...prev,
        [variables.item.externalId]: variables.status,
      }));
      toast.success(`Updated "${variables.item.title}" to ${getStatusVerb(variables.status)}`);
      router.refresh();
    },
    onError: (err) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to update status");
      }
    },
  });

  if (!recommendations || recommendations.length === 0) return null;

  return (
    <ScrollRow
      title={<h3 className="text-xs font-semibold text-foreground">More like this</h3>}
      action={
        <span className="text-xs text-muted-foreground">{recommendations.length} recommended</span>
      }
    >
      {recommendations.map((item) => (
        <div key={item.externalId} className="w-36 sm:w-44 shrink-0 snap-start">
          <MediaCard
            title={item.title}
            mediaType={item.mediaType}
            posterUrl={item.posterUrl}
            releaseYear={item.releaseYear}
            rating={item.rating}
            currentStatus={localStatuses[item.externalId] || null}
            onClick={() => router.push(`/media/${item.mediaType}/${item.id}`)}
            onQuickStatus={(status) => setQuickStatus({ item, status })}
          />
        </div>
      ))}
    </ScrollRow>
  );
}
