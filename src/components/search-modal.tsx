"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Bookmark,
  Check,
  Film,
  Gamepad2,
  Play,
  Search,
  Tv,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { PosterImage } from "@/components/poster-image";
import { useDebounce } from "@/hooks/use-debounce";
import { useSearchModal } from "@/hooks/use-search-modal";
import { logEntryApi } from "@/lib/api-entries";
import { getMediaTypeLabel, getStatusVerb } from "@/lib/media-formatters";
import { cn, getMediaHref } from "@/lib/utils";

export type MediaFilterType = "all" | "movie" | "tv" | "game";

const TRENDING_SUGGESTIONS = [
  { title: "Dune: Part Two", type: "Movie" },
  { title: "Elden Ring", type: "Game" },
  { title: "Severance", type: "TV" },
  { title: "Arcane", type: "TV" },
  { title: "Cyberpunk 2077", type: "Game" },
  { title: "Shōgun", type: "TV" },
];

export function SearchModal() {
  const router = useRouter();
  const { isOpen, closeSearch, toggleSearch } = useSearchModal();
  const [query, setQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState<MediaFilterType>("all");
  const [trackedStatus, setTrackedStatus] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd+K / Ctrl+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleSearch();
      } else if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        closeSearch();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, toggleSearch, closeSearch]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
    setQuery("");
    setMediaFilter("all");
  }, [isOpen]);

  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, isError, refetch } = useQuery<{
    results: UnifiedSearchResult[];
  }>({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { results: [] };
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) {
        throw new Error("Failed to search catalog");
      }
      return res.json();
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const { mutate: logMedia, isPending } = useMutation({
    mutationFn: async ({
      media,
      status,
    }: {
      media: UnifiedSearchResult;
      status: "want_to" | "doing" | "done";
    }) => {
      return logEntryApi({ media, status });
    },
    onSuccess: (_, variables) => {
      setTrackedStatus((prev) => ({
        ...prev,
        [variables.media.externalId]: variables.status,
      }));
      router.refresh();
      toast.success(getStatusVerb(variables.status), {
        description: variables.media.title,
      });
    },
    onError: (err: Error) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to log title");
      }
    },
  });

  if (!isOpen) return null;

  const isQueryActive = query.trim().length > 0;
  const rawResults = data?.results || [];
  const filteredResults = rawResults.filter((item) => {
    if (mediaFilter === "all") return true;
    return item.mediaType === mediaFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm cursor-default animate-in fade-in-0 duration-150"
        onClick={closeSearch}
        aria-hidden="true"
      />

      {/* Floating Dialog */}
      <div className="relative z-10 w-full max-w-xl flex flex-col animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="w-full h-12 px-4 rounded-full bg-card border border-border shadow-2xl flex items-center justify-between text-foreground">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Search className="size-4.5 text-brand shrink-0" strokeWidth={2} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, TV series, games..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-sans"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear query"
                className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={closeSearch}
              className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground hover:text-foreground cursor-pointer border border-border font-mono"
            >
              Esc
            </button>
          </div>
        </div>

        {/* Results / Suggestions Dropdown */}
        <div className="w-full mt-2.5 bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[60vh] flex flex-col text-foreground">
          {/* Zero Query State */}
          {!isQueryActive && (
            <div className="p-4 sm:p-5 flex flex-col gap-4 overflow-y-auto">
              <div className="flex flex-col gap-2">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
                  Filter by medium
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(
                    [
                      { id: "all", label: "All", icon: Search },
                      { id: "movie", label: "Movies", icon: Film },
                      { id: "tv", label: "TV Series", icon: Tv },
                      { id: "game", label: "Games", icon: Gamepad2 },
                    ] as const
                  ).map((chip) => {
                    const Icon = chip.icon;
                    const isSelected = mediaFilter === chip.id;
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setMediaFilter(chip.id as MediaFilterType)}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border",
                          isSelected
                            ? "bg-foreground text-background border-foreground shadow-xs"
                            : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border-border",
                        )}
                      >
                        <Icon className="size-3.5" />
                        <span>{chip.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Trending suggestions */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-mono">
                  Trending suggestions
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {TRENDING_SUGGESTIONS.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => setQuery(item.title)}
                      className="flex items-center justify-between p-2 rounded-xl bg-muted/40 hover:bg-muted border border-border text-xs text-left transition group cursor-pointer"
                    >
                      <span className="font-medium text-foreground truncate group-hover:text-brand transition-colors">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0 ml-1">
                        {item.type}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Query Results */}
          {isQueryActive && (
            <>
              <div className="px-4 py-2 border-b border-border flex items-center justify-between text-xs text-muted-foreground bg-muted/20">
                <div className="flex items-center gap-1">
                  {(["all", "movie", "tv", "game"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMediaFilter(t)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition cursor-pointer",
                        mediaFilter === t
                          ? "bg-muted text-foreground border border-border shadow-2xs"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {t === "all" ? "All" : t === "tv" ? "TV Series" : `${t}s`}
                    </button>
                  ))}
                </div>

                {!isLoading && (
                  <span className="text-[11px] font-mono tabular-nums">
                    {filteredResults.length} {filteredResults.length === 1 ? "result" : "results"}
                  </span>
                )}
              </div>

              <div className="p-3 overflow-y-auto max-h-[48vh] space-y-1.5">
                {isLoading && (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                    <div className="size-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
                    <span className="text-xs font-mono">Searching catalog...</span>
                  </div>
                )}

                {isError && (
                  <div className="py-8 text-center flex flex-col items-center gap-2">
                    <p className="text-xs text-destructive">Failed to load search results</p>
                    <button
                      type="button"
                      onClick={() => refetch()}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition cursor-pointer border border-border"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {!isLoading && !isError && filteredResults.length === 0 && (
                  <p className="text-center text-xs text-muted-foreground py-12">
                    No results found for &ldquo;{query}&rdquo;
                    {mediaFilter !== "all" ? ` in ${mediaFilter}s` : ""}
                  </p>
                )}

                {!isError &&
                  filteredResults.map((item) => {
                    const currentLoggedStatus = trackedStatus[item.externalId];

                    return (
                      <div
                        key={item.externalId}
                        className="flex items-center justify-between gap-3 p-2 rounded-xl bg-card hover:bg-muted/50 border border-border transition-all group"
                      >
                        <Link
                          href={getMediaHref(item)}
                          onClick={closeSearch}
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                        >
                          <div className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-border bg-muted">
                            <PosterImage
                              src={item.posterUrl}
                              title={item.title}
                              mediaType={item.mediaType}
                              sizes="40px"
                              compact
                              className="object-cover group-hover:scale-105 transition-transform duration-200"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-xs sm:text-sm text-foreground group-hover:text-brand truncate transition-colors font-sans">
                                {item.title}
                              </span>
                              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border border-border bg-muted text-muted-foreground shrink-0 font-mono">
                                {getMediaTypeLabel(item.mediaType)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
                              <span className="tabular-nums">{item.releaseYear || "TBA"}</span>
                              {item.creator ? ` • ${item.creator}` : ""}
                            </p>
                          </div>
                        </Link>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            title="Add to Queue"
                            disabled={isPending}
                            onClick={() => logMedia({ media: item, status: "want_to" })}
                            className={cn(
                              "p-2 rounded-xl transition cursor-pointer border select-none",
                              currentLoggedStatus === "want_to"
                                ? "bg-status-queue/20 text-status-queue border-status-queue/40 font-bold"
                                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border-border",
                            )}
                          >
                            <Bookmark className="size-4 stroke-2" />
                          </button>

                          <button
                            type="button"
                            title="In Progress"
                            disabled={isPending}
                            onClick={() => logMedia({ media: item, status: "doing" })}
                            className={cn(
                              "p-2 rounded-xl transition cursor-pointer border select-none",
                              currentLoggedStatus === "doing"
                                ? "bg-status-doing/20 text-status-doing border-status-doing/40 font-bold"
                                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border-border",
                            )}
                          >
                            <Play className="size-4 stroke-2" />
                          </button>

                          <button
                            type="button"
                            title="Completed"
                            disabled={isPending}
                            onClick={() => logMedia({ media: item, status: "done" })}
                            className={cn(
                              "p-2 rounded-xl transition cursor-pointer border select-none",
                              currentLoggedStatus === "done"
                                ? "bg-status-done/20 text-status-done border-status-done/40 font-bold"
                                : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted border-border",
                            )}
                          >
                            <Check className="size-4 stroke-2" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
