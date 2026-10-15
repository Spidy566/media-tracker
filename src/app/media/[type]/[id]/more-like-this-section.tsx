"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import { logEntryApi } from "@/lib/api-entries";
import { cn } from "@/lib/utils";
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
  const queryClient = useQueryClient();
  const rowRef = useRef<HTMLDivElement>(null);

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
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      router.refresh();
    },
    onError: (err) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to update status");
      }
    },
  });

  if (!recommendations || recommendations.length === 0) return null;

  const scroll = (direction: "left" | "right") => {
    if (!rowRef.current) return;
    const amount = direction === "left" ? -350 : 350;
    rowRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">More like this</h3>
        <span className="text-xs text-muted-foreground">{recommendations.length} recommended</span>
      </div>

      <div className="relative group/shelf">
        <div
          ref={rowRef}
          className={cn(
            "overflow-x-auto snap-x snap-mandatory flex gap-4 scroll-smooth no-scrollbar pb-3",
          )}
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
        </div>

        {/* Right-edge fade */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-3 w-12 sm:w-20 bg-linear-to-l from-background via-background/80 to-transparent z-10"
        />

        {/* Left / Right chevron scroll buttons */}
        <button
          type="button"
          onClick={() => scroll("left")}
          aria-label="Scroll left"
          className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 size-9 rounded-full bg-card/95 hover:bg-card border border-border shadow-md items-center justify-center text-muted-foreground hover:text-foreground z-20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft className="size-4.5" />
        </button>

        <button
          type="button"
          onClick={() => scroll("right")}
          aria-label="Scroll right"
          className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 size-9 rounded-full bg-card/95 hover:bg-card border border-border shadow-md items-center justify-center text-muted-foreground hover:text-foreground z-20 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight className="size-4.5" />
        </button>
      </div>
    </div>
  );
}
