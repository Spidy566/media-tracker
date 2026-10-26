"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  Bookmark,
  Check,
  Film,
  Gamepad2,
  Play,
  Search,
  Star,
  Tv,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { type MediaFilterType, useSearch } from "@/components/navbar/search-context";
import { PosterImage } from "@/components/poster-image";
import { useDebounce } from "@/hooks/use-debounce";
import { logEntryApi } from "@/lib/api-entries";
import { cn } from "@/lib/utils";

const STAR_VALUES = [1, 2, 3, 4, 5];

const TRENDING_SUGGESTIONS = [
  { title: "Dune: Part Two", type: "Movie" },
  { title: "Elden Ring", type: "Game" },
  { title: "Severance", type: "TV" },
  { title: "Arcane", type: "TV" },
  { title: "Cyberpunk 2077", type: "Game" },
  { title: "Shōgun", type: "TV" },
];

export function SearchDropdownContent() {
  const router = useRouter();
  const { query, setQuery, mediaFilter, setMediaFilter, closeSearch } = useSearch();
  const [trackedStatus, setTrackedStatus] = useState<Record<string, string>>({});
  const [activeLoggingId, setActiveLoggingId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [note, setNote] = useState("");

  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading, isError, refetch } = useQuery<{
    results: UnifiedSearchResult[];
  }>({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { results: [] };
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      if (!res.ok) {
        throw new Error("Failed to search archives");
      }
      return res.json();
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const { mutate: logMedia, isPending } = useMutation({
    mutationFn: async ({
      media,
      status,
      userRating,
      reviewNote,
    }: {
      media: UnifiedSearchResult;
      status: "want_to" | "doing" | "done";
      userRating?: number | null;
      reviewNote?: string | null;
    }) => {
      return logEntryApi({
        media,
        status,
        rating: userRating ?? null,
        reviewNote: reviewNote || null,
      });
    },
    onSuccess: (_, variables) => {
      setTrackedStatus((prev) => ({
        ...prev,
        [variables.media.externalId]: variables.status,
      }));
      setActiveLoggingId(null);
      setNote("");
      router.refresh();

      const messages = {
        want_to: "Added to Queue",
        doing: "Marked as In Progress",
        done: "Logged as Completed",
      };
      toast.success(messages[variables.status], {
        description: variables.media.title,
      });
    },
    onError: (err: Error) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to log media");
      }
    },
  });

  const isQueryActive = query.trim().length > 0;
  const rawResults = data?.results || [];
  const filteredResults = rawResults.filter((item) => {
    if (mediaFilter === "all") return true;
    return item.mediaType === mediaFilter;
  });

  return (
    <div className="flex flex-col max-h-[60vh] overflow-hidden text-neutral-100">
      {/* 1. ZERO QUERY STATE */}
      {!isQueryActive && (
        <div className="p-4 sm:p-5 flex flex-col gap-4.5 overflow-y-auto no-scrollbar">
          {/* Media Type Chips */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2 px-1">
              Media Type
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { label: "All", value: "all" as MediaFilterType },
                  {
                    label: "Movies",
                    value: "movie" as MediaFilterType,
                    icon: Film,
                  },
                  {
                    label: "TV Shows",
                    value: "tv" as MediaFilterType,
                    icon: Tv,
                  },
                  {
                    label: "Games",
                    value: "game" as MediaFilterType,
                    icon: Gamepad2,
                  },
                ] as const
              ).map((tab) => {
                const Icon = "icon" in tab ? tab.icon : null;
                const isSelected = mediaFilter === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setMediaFilter(tab.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 cursor-pointer border select-none",
                      isSelected
                        ? "bg-white/15 text-white border-white/25 shadow-xs"
                        : "bg-white/4 text-neutral-300 border-white/8 hover:bg-white/8 hover:text-white",
                    )}
                  >
                    {Icon && <Icon className="size-3.5 opacity-70" />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Quick Filters */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2 px-1">
              Shelf Status
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  closeSearch();
                  router.push("/shelf?status=want_to");
                }}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/4 hover:bg-white/8 border border-white/8 text-neutral-200 hover:text-white transition-all text-xs font-medium cursor-pointer group text-left select-none"
              >
                <span className="size-2 rounded-full bg-status-queue shadow-[0_0_8px_rgba(59,130,246,0.6)] shrink-0" />
                <span className="flex-1 truncate">In Queue</span>
                <ArrowRight className="size-3.5 text-neutral-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  closeSearch();
                  router.push("/shelf?status=doing");
                }}
                className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-white/4 hover:bg-white/8 border border-white/8 text-neutral-200 hover:text-white transition-all text-xs font-medium cursor-pointer group text-left select-none"
              >
                <span className="size-2 rounded-full bg-status-doing shadow-[0_0_8px_rgba(249,115,22,0.6)] shrink-0" />
                <span className="flex-1 truncate">In Progress</span>
                <ArrowRight className="size-3.5 text-neutral-500 group-hover:text-white transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>

          {/* Quick Trending Suggestions */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2 px-1 flex items-center justify-between">
              <span>Quick Suggestions</span>
              <span className="text-[10px] text-neutral-400 font-normal">Click to search</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {TRENDING_SUGGESTIONS.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setQuery(item.title)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/4 hover:bg-white/10 border border-white/8 hover:border-white/20 text-neutral-300 hover:text-white transition-all text-xs cursor-pointer group select-none"
                >
                  <Search className="size-3 text-neutral-500 group-hover:text-neutral-300" />
                  <span className="font-medium">{item.title}</span>
                  <span className="text-[10px] text-neutral-400 uppercase font-mono px-1 py-0.2 rounded bg-white/6">
                    {item.type}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. ACTIVE QUERY RESULTS STATE */}
      {isQueryActive && (
        <>
          {/* Category Filter Subbar */}
          <div className="px-4 py-2 border-b border-white/8 flex items-center justify-between text-xs text-neutral-400 bg-white/2 shrink-0">
            <div className="flex items-center gap-1.5">
              {(
                [
                  { label: "All", value: "all" as MediaFilterType },
                  { label: "Movies", value: "movie" as MediaFilterType },
                  { label: "TV", value: "tv" as MediaFilterType },
                  { label: "Games", value: "game" as MediaFilterType },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setMediaFilter(tab.value)}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer select-none",
                    mediaFilter === tab.value
                      ? "bg-white/15 text-white shadow-xs"
                      : "text-neutral-400 hover:text-neutral-200 hover:bg-white/6",
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <span className="text-[11px] text-neutral-400">
              {isLoading
                ? "Searching..."
                : `${filteredResults.length} ${filteredResults.length === 1 ? "result" : "results"}`}
            </span>
          </div>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2">
            {isLoading && (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-xs text-neutral-400">
                <div className="size-4 rounded-full border-2 border-neutral-500 border-t-brand animate-spin" />
                <span>Searching TMDB & IGDB archives...</span>
              </div>
            )}

            {isError && (
              <div className="text-center py-10 space-y-2.5">
                <p className="text-xs font-semibold text-neutral-200">Failed to search archives</p>
                <p className="text-xs text-neutral-400">
                  Something went wrong while querying TMDB & IGDB.
                </p>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 text-white transition cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {!isLoading && !isError && filteredResults.length === 0 && (
              <p className="text-center text-xs text-neutral-400 py-12">
                No results found for &ldquo;{query}&rdquo;
                {mediaFilter !== "all" ? ` in ${mediaFilter}s` : ""}
              </p>
            )}

            {!isError &&
              filteredResults.map((item) => {
                const currentLoggedStatus = trackedStatus[item.externalId];
                const isLoggingThis = activeLoggingId === item.externalId;

                const badgeColor =
                  item.mediaType === "movie"
                    ? "bg-purple-500/15 text-purple-300 border-purple-500/25"
                    : item.mediaType === "tv"
                      ? "bg-blue-500/15 text-blue-300 border-blue-500/25"
                      : "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";

                return (
                  <div
                    key={item.externalId}
                    className="flex flex-col p-2.5 rounded-xl bg-white/4 hover:bg-white/7 border border-white/6 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      {/* 40px rounded poster thumbnail */}
                      <Link
                        href={`/media/${item.mediaType}/${item.externalId}`}
                        onClick={closeSearch}
                        className="relative w-10 h-14 rounded-lg overflow-hidden shrink-0 border border-white/10 bg-neutral-900 group"
                      >
                        <PosterImage
                          src={item.posterUrl}
                          title={item.title}
                          mediaType={item.mediaType}
                          sizes="40px"
                          compact
                          className="object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      </Link>

                      {/* Title + Pill + Release Year */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/media/${item.mediaType}/${item.externalId}`}
                            onClick={closeSearch}
                            className="font-medium text-sm text-neutral-100 hover:text-brand truncate transition-colors"
                          >
                            {item.title}
                          </Link>
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded border shrink-0",
                              badgeColor,
                            )}
                          >
                            {item.mediaType === "movie"
                              ? "Movie"
                              : item.mediaType === "tv"
                                ? "TV"
                                : "Game"}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-400 mt-0.5 truncate">
                          {item.releaseYear || "TBA"}
                          {item.creator ? ` • ${item.creator}` : ""}
                        </p>
                      </div>

                      {/* Right-aligned Quick Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        {/* 1. Queue (+ Queue / Bookmark) */}
                        <button
                          type="button"
                          title="Add to Queue"
                          disabled={isPending}
                          onClick={() => logMedia({ media: item, status: "want_to" })}
                          className={cn(
                            "p-2 rounded-xl transition cursor-pointer border select-none",
                            currentLoggedStatus === "want_to"
                              ? "bg-status-queue/25 text-status-queue border-status-queue/40 font-bold"
                              : "bg-white/4 text-neutral-400 hover:text-white hover:bg-white/10 border-white/6",
                          )}
                        >
                          <Bookmark className="size-4 stroke-[2]" />
                        </button>

                        {/* 2. In Progress (Play / Doing) */}
                        <button
                          type="button"
                          title="Currently In Progress"
                          disabled={isPending}
                          onClick={() => logMedia({ media: item, status: "doing" })}
                          className={cn(
                            "p-2 rounded-xl transition cursor-pointer border select-none",
                            currentLoggedStatus === "doing"
                              ? "bg-status-doing/25 text-status-doing border-status-doing/40 font-bold"
                              : "bg-white/4 text-neutral-400 hover:text-white hover:bg-white/10 border-white/6",
                          )}
                        >
                          <Play className="size-4 stroke-[2]" />
                        </button>

                        {/* 3. Finished (Check / Done) */}
                        <button
                          type="button"
                          title="Mark as Completed"
                          disabled={isPending}
                          onClick={() => setActiveLoggingId(isLoggingThis ? null : item.externalId)}
                          className={cn(
                            "p-2 rounded-xl transition cursor-pointer border select-none",
                            currentLoggedStatus === "done" || isLoggingThis
                              ? "bg-status-done/25 text-status-done border-status-done/40 font-bold"
                              : "bg-white/4 text-neutral-400 hover:text-white hover:bg-white/10 border-white/6",
                          )}
                        >
                          <Check className="size-4 stroke-[2]" />
                        </button>
                      </div>
                    </div>

                    {/* Inline 5-Star Rating & Review Drawer */}
                    {isLoggingThis && (
                      <div className="mt-3 pt-3 border-t border-white/8 flex flex-col gap-2.5 animate-in fade-in-50 duration-150">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-neutral-200">Score:</span>
                          <div className="flex items-center gap-1">
                            {STAR_VALUES.map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setRating(star)}
                                className="p-1 cursor-pointer transition hover:scale-110"
                              >
                                <Star
                                  className={cn(
                                    "size-4",
                                    star <= rating ? "fill-rating text-rating" : "text-neutral-500",
                                  )}
                                />
                              </button>
                            ))}
                            <span className="text-xs font-semibold text-rating ml-1.5 font-mono">
                              {rating} / 5
                            </span>
                          </div>
                        </div>

                        <input
                          type="text"
                          placeholder="One-line review or thought (optional)..."
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          className="w-full text-xs bg-white/4 border border-white/10 rounded-xl px-3 py-2 text-white placeholder:text-neutral-500 outline-none focus:border-white/20"
                        />

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveLoggingId(null)}
                            className="text-xs px-3 py-1.5 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              logMedia({
                                media: item,
                                status: "done",
                                userRating: rating,
                                reviewNote: note,
                              })
                            }
                            className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-brand text-brand-foreground hover:opacity-90 transition cursor-pointer"
                          >
                            Save Finished
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}
    </div>
  );
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const { query, setQuery, closeSearch } = useSearch();

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    closeSearch();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-4">
      {/* Soft transparent backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm cursor-default"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Floating container */}
      <div className="relative z-10 w-full max-w-xl flex flex-col animate-in fade-in-0 zoom-in-95 duration-150">
        {/* Floating Search Pill */}
        <div className="w-full h-12 px-4 rounded-full bg-[#1c1c24] border border-white/20 shadow-2xl shadow-black/60 flex items-center justify-between text-white ring-2 ring-white/10">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Search className="size-4.5 text-brand shrink-0" strokeWidth={2} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, TV shows, games..."
              className="w-full bg-transparent text-[14px] text-white placeholder:text-neutral-400 outline-none"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear query"
                className="p-1 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/10 text-neutral-200 hover:bg-white/15 cursor-pointer"
            >
              Esc
            </button>
          </div>
        </div>

        {/* Anchored Dropdown */}
        <div className="w-full mt-2.5 bg-[#1c1c24]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
          <SearchDropdownContent />
        </div>
      </div>
    </div>
  );
}
