"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import { MediaGrid } from "@/components/media-grid";
import { logEntryApi } from "@/lib/api-entries";
import type { PersonCastCredit, PersonCrewGroup } from "@/lib/person-details";

// --- Types ---

interface FilmographyProps {
  castCredits: PersonCastCredit[];
  crewGroups: PersonCrewGroup[];
  hiddenCount: number;
  /** Map of externalId -> user status for the current user */
  statusMap: Record<string, MediaStatus>;
  knownForDepartment?: string | null;
}

type TabKey = "Acting" | "Directing" | "Writing" | "Producing" | "Music";
type MediaFilter = "all" | "movie" | "tv";
type SortMode = "newest" | "popular";

interface NormalizedCreditItem {
  externalId: string;
  mediaType: "movie" | "tv";
  title: string;
  year: number | null;
  posterPath: string | null;
  subtitle: string;
  popularity: number;
  voteCount: number;
  isFiltered?: boolean;
}

// --- Helpers ---

function getDepartmentTab(department: string | null | undefined): TabKey | null {
  if (!department) return null;
  switch (department) {
    case "Acting":
      return "Acting";
    case "Directing":
      return "Directing";
    case "Writing":
      return "Writing";
    case "Production":
      return "Producing";
    case "Sound":
    case "Music":
    case "Soundtrack":
    case "Composer":
      return "Music";
    default:
      return null;
  }
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

function posterUrl(path: string | null) {
  return path ? `https://image.tmdb.org/t/p/w780${path}` : null;
}

// --- Component ---

export function Filmography({
  castCredits,
  crewGroups,
  hiddenCount,
  statusMap,
  knownForDepartment,
}: FilmographyProps) {
  const router = useRouter();

  // Determine available tabs: primary department first, others sorted by credit count
  const availableTabs = useMemo(() => {
    const counts: Record<TabKey, number> = {
      Acting: castCredits.length,
      Directing: crewGroups.find((g) => g.department === "Directing")?.credits.length || 0,
      Writing: crewGroups.find((g) => g.department === "Writing")?.credits.length || 0,
      Producing: crewGroups.find((g) => g.department === "Production")?.credits.length || 0,
      Music: crewGroups.find((g) => g.department === "Music")?.credits.length || 0,
    };

    const tabsWithCredits = (Object.keys(counts) as TabKey[]).filter((tab) => counts[tab] > 0);
    const primaryTab = getDepartmentTab(knownForDepartment);

    if (primaryTab && tabsWithCredits.includes(primaryTab)) {
      const others = tabsWithCredits
        .filter((t) => t !== primaryTab)
        .sort((a, b) => counts[b] - counts[a]);
      return [primaryTab, ...others];
    }

    return tabsWithCredits.sort((a, b) => counts[b] - counts[a]);
  }, [castCredits, crewGroups, knownForDepartment]);

  const [activeTab, setActiveTab] = useState<TabKey>(availableTabs[0] || "Acting");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [showAll, setShowAll] = useState(false);
  const [localStatuses, setLocalStatuses] = useState<Record<string, MediaStatus>>({});

  // Quick-add mutation
  const { mutate: setQuickStatus } = useMutation({
    mutationFn: async ({
      credit,
      status,
    }: {
      credit: {
        externalId: string;
        mediaType: "movie" | "tv";
        title: string;
        year: number | null;
        posterPath: string | null;
      };
      status: "want_to" | "doing" | "done";
    }) => {
      return logEntryApi({
        media: {
          externalId: credit.externalId,
          mediaType: credit.mediaType,
          title: credit.title,
          releaseYear: credit.year,
          posterUrl: posterUrl(credit.posterPath),
        },
        status,
      });
    },
    onSuccess: (_, variables) => {
      setLocalStatuses((prev) => ({
        ...prev,
        [variables.credit.externalId]: variables.status,
      }));
      toast.success(`Updated "${variables.credit.title}" to ${getStatusVerb(variables.status)}`);
      router.refresh();
    },
    onError: (err) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to update status");
      }
    },
  });

  // Build credits list based on active tab
  const credits: NormalizedCreditItem[] = useMemo(() => {
    if (activeTab === "Acting") {
      return castCredits.map((c) => ({
        externalId: c.externalId,
        mediaType: c.mediaType,
        title: c.title,
        year: c.year,
        posterPath: c.posterPath,
        subtitle: c.character || "",
        popularity: c.popularity,
        voteCount: c.voteCount,
        isFiltered: c.isFiltered,
      }));
    }
    const dept = activeTab === "Producing" ? "Production" : activeTab;
    const group = crewGroups.find((g) => g.department === dept);
    if (!group) return [];
    return group.credits.map((c) => ({
      externalId: c.externalId,
      mediaType: c.mediaType,
      title: c.title,
      year: c.year,
      posterPath: c.posterPath,
      subtitle: c.job,
      popularity: c.popularity,
      voteCount: c.voteCount,
      isFiltered: c.isFiltered,
    }));
  }, [activeTab, castCredits, crewGroups]);

  // Apply filters
  const filtered = useMemo(() => {
    let items = credits;

    // Media type filter
    if (mediaFilter !== "all") {
      items = items.filter((c) => c.mediaType === mediaFilter);
    }

    // Hide low-vote or filtered credits unless showAll
    if (!showAll) {
      items = items.filter(
        (c) =>
          !c.isFiltered &&
          (c.voteCount > 0 || c.year === null || c.year >= new Date().getFullYear()),
      );
    }

    // Sort
    if (sortMode === "newest") {
      items = [...items].sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
    } else {
      items = [...items].sort((a, b) => b.popularity - a.popularity);
    }

    return items;
  }, [credits, mediaFilter, sortMode, showAll]);

  // Group by year for newest sort
  const yearGroups = useMemo(() => {
    if (sortMode !== "newest") return null;
    const groups = new Map<number | null, typeof filtered>();
    for (const item of filtered) {
      const key = item.year;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)?.push(item);
    }
    return groups;
  }, [filtered, sortMode]);

  if (availableTabs.length === 0) return null;

  const mergedStatuses = { ...statusMap, ...localStatuses };

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border">
          {availableTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === tab
                  ? "bg-foreground text-background shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Media filter */}
        <div className="flex items-center gap-1">
          {(["all", "movie", "tv"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setMediaFilter(f)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                mediaFilter === f
                  ? "bg-card border border-border text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "all" ? "All" : f === "movie" ? "Movies" : "TV"}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1 ml-auto">
          {(["newest", "popular"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSortMode(s)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                sortMode === s
                  ? "bg-card border border-border text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "newest" ? "Newest" : "Popular"}
            </button>
          ))}
        </div>
      </div>

      {/* Music incomplete note if credit count under 3 */}
      {activeTab === "Music" && credits.length < 3 && (
        <p className="text-xs text-muted-foreground italic">
          Music credits on TMDB can be incomplete.
        </p>
      )}

      {/* Show all toggle */}
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-xs font-medium text-muted-foreground hover:text-foreground transition cursor-pointer"
        >
          {showAll ? "Hide filtered credits" : `Show all credits (+${hiddenCount} hidden)`}
        </button>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No credits found for these filters.
        </p>
      ) : yearGroups ? (
        // Grouped by year
        <div className="space-y-6">
          {[...yearGroups.entries()].map(([year, items]) => (
            <div key={year ?? "tba"} className="space-y-3">
              <h4 className="text-xs font-semibold text-muted-foreground">{year ?? "TBA"}</h4>
              <MediaGrid>
                {items.map((credit) => (
                  <MediaCard
                    key={credit.externalId}
                    title={credit.title}
                    mediaType={credit.mediaType}
                    posterUrl={posterUrl(credit.posterPath)}
                    releaseYear={credit.year}
                    subtitle={credit.subtitle}
                    badge={
                      mergedStatuses[credit.externalId] ? (
                        <span
                          className={`size-2.5 rounded-full ring-2 ring-background inline-block ${
                            mergedStatuses[credit.externalId] === "done"
                              ? "bg-status-done"
                              : mergedStatuses[credit.externalId] === "doing"
                                ? "bg-status-doing"
                                : "bg-status-queue"
                          }`}
                        />
                      ) : null
                    }
                    currentStatus={mergedStatuses[credit.externalId] || null}
                    onClick={() => {
                      const parts = credit.externalId.split(":");
                      const id = parts[parts.length - 1];
                      router.push(`/media/${credit.mediaType}/${id}`);
                    }}
                    onQuickStatus={(status) => setQuickStatus({ credit, status })}
                  />
                ))}
              </MediaGrid>
            </div>
          ))}
        </div>
      ) : (
        // Flat grid (popular sort)
        <MediaGrid>
          {filtered.map((credit) => (
            <MediaCard
              key={credit.externalId}
              title={credit.title}
              mediaType={credit.mediaType}
              posterUrl={posterUrl(credit.posterPath)}
              releaseYear={credit.year}
              subtitle={credit.subtitle}
              badge={
                mergedStatuses[credit.externalId] ? (
                  <span
                    className={`size-2.5 rounded-full ring-2 ring-background inline-block ${
                      mergedStatuses[credit.externalId] === "done"
                        ? "bg-status-done"
                        : mergedStatuses[credit.externalId] === "doing"
                          ? "bg-status-doing"
                          : "bg-status-queue"
                    }`}
                  />
                ) : null
              }
              currentStatus={mergedStatuses[credit.externalId] || null}
              onClick={() => {
                const parts = credit.externalId.split(":");
                const id = parts[parts.length - 1];
                router.push(`/media/${credit.mediaType}/${id}`);
              }}
              onQuickStatus={(status) => setQuickStatus({ credit, status })}
            />
          ))}
        </MediaGrid>
      )}
    </div>
  );
}
