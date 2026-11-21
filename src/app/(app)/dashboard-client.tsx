"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { DashboardHeader, type LibraryCounts } from "@/components/dashboard/dashboard-header";
import { JumpBackInSection } from "@/components/dashboard/jump-back-in-section";
import { LastTrackedSection } from "@/components/dashboard/last-tracked-section";
import { QueueRouletteModal } from "@/components/dashboard/queue-roulette-modal";
import { QueueSection } from "@/components/dashboard/queue-section";
import { TrendingSection } from "@/components/dashboard/trending-section";
import type { MediaStatus } from "@/components/media-card";
import { logEntryApi } from "@/lib/api-entries";
import type { HomeSection } from "@/lib/home-prefs";
import { getStatusVerb } from "@/lib/media-formatters";
import type { Entry, EntryUser } from "@/types/entry";

export type { LibraryCounts };

interface DashboardClientProps {
  currentUser: EntryUser | null;
  libraryCounts: LibraryCounts;
  activeItems: Entry[];
  queueItems?: Entry[];
  recentEntries: Entry[];
  trendingMovies: UnifiedSearchResult[];
  trendingTv: UnifiedSearchResult[];
  trendingGames: UnifiedSearchResult[];
  initialEntries?: Entry[];
  hiddenSections?: HomeSection[];
}

export function DashboardClient({
  currentUser,
  libraryCounts,
  activeItems,
  queueItems = [],
  recentEntries,
  trendingMovies,
  trendingTv,
  trendingGames,
  hiddenSections = [],
}: DashboardClientProps) {
  const router = useRouter();
  const [isRouletteOpen, setIsRouletteOpen] = useState(false);

  // Quick 1-click status mutation
  const { mutate: setQuickStatus, isPending } = useMutation({
    mutationFn: async ({
      media,
      status,
    }: {
      media: Entry["media"] | UnifiedSearchResult;
      status: MediaStatus;
    }) => {
      return logEntryApi({
        media,
        status,
      });
    },
    onSuccess: (_, variables) => {
      router.refresh();
      const actionVerb = getStatusVerb(variables.status);
      toast.success(actionVerb, { description: variables.media.title });
    },
    onError: (err: Error) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to update status");
      }
    },
  });

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col pb-24">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 py-8 space-y-10 sm:space-y-12">
        {/* 1. Header + Live Pulse Strip */}
        <DashboardHeader currentUser={currentUser} libraryCounts={libraryCounts} />

        {/* 2. Jump Back In (In-Progress) */}
        {!hiddenSections.includes("jump") && (
          <JumpBackInSection
            activeItems={activeItems}
            onMarkDone={(entry) => setQuickStatus({ media: entry.media, status: "done" })}
            isPending={isPending}
          />
        )}

        {/* 3. Up Next in Queue */}
        {!hiddenSections.includes("queue") && (
          <QueueSection
            queueItems={queueItems}
            onQuickStatus={(media, status) => setQuickStatus({ media, status })}
            onOpenRoulette={() => setIsRouletteOpen(true)}
          />
        )}

        {/* 4. Last Tracked Activity */}
        <LastTrackedSection recentEntries={recentEntries} />

        {/* 5. Trending This Week */}
        {!hiddenSections.includes("trending") && (
          <TrendingSection
            trendingMovies={trendingMovies}
            trendingTv={trendingTv}
            trendingGames={trendingGames}
            onQuickStatus={(media, status) => setQuickStatus({ media, status })}
          />
        )}
      </div>

      {/* Queue Roulette Picker Modal */}
      <QueueRouletteModal
        isOpen={isRouletteOpen}
        onClose={() => setIsRouletteOpen(false)}
        entries={queueItems}
        onStartDoing={(entry) => setQuickStatus({ media: entry.media, status: "doing" })}
      />
    </div>
  );
}
