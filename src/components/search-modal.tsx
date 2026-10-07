"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bookmark, Check, Play, Search, Star, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { useDebounce } from "@/hooks/use-debounce";
import { logEntryApi } from "@/lib/api-entries";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STAR_VALUES = [1, 2, 3, 4, 5];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [trackedStatus, setTrackedStatus] = useState<Record<string, string>>({});
  const [activeLoggingId, setActiveLoggingId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [note, setNote] = useState("");

  const debouncedQuery = useDebounce(query, 300);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const { data, isLoading } = useQuery<{ results: UnifiedSearchResult[] }>({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { results: [] };
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
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
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      queryClient.invalidateQueries({ queryKey: ["squad-entries"] });

      const messages = {
        want_to: "Added to Queue",
        doing: "Marked as In Progress",
        done: "Logged as Completed",
      };
      toast.success(messages[variables.status], {
        description: variables.media.title,
      });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close search"
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-default border-0"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 bg-card text-card-foreground border border-border w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        {/* Search Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center gap-3">
          <Search className="w-5 h-5 text-muted-foreground shrink-0" />
          <input
            placeholder="Search movies, TV shows, games..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-base sm:text-lg font-medium text-foreground placeholder:text-muted-foreground outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="p-1 rounded-full text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-muted text-muted-foreground hover:text-foreground"
          >
            Esc
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {isLoading && (
            <p className="text-center text-xs text-muted-foreground py-12">
              Searching TMDB & IGDB archives...
            </p>
          )}

          {!isLoading && data?.results?.length === 0 && debouncedQuery.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-12">
              No results found for &ldquo;{query}&rdquo;
            </p>
          )}

          {data?.results?.map((item) => {
            const currentLoggedStatus = trackedStatus[item.externalId];
            const isLoggingThis = activeLoggingId === item.externalId;

            return (
              <div
                key={item.externalId}
                className="flex flex-col p-3 rounded-2xl bg-muted/40 hover:bg-muted/70 border border-border transition-all"
              >
                <div className="flex items-center gap-4">
                  {item.posterUrl ? (
                    <Image
                      src={item.posterUrl}
                      alt={item.title}
                      width={44}
                      height={66}
                      className="rounded-xl object-cover aspect-2/3 w-11 border border-border shrink-0"
                    />
                  ) : (
                    <div className="w-11 aspect-2/3 bg-muted border border-border rounded-xl flex items-center justify-center text-[9px] text-muted-foreground font-mono font-bold shrink-0">
                      NO ART
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-foreground truncate">{item.title}</h3>
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full bg-foreground/10 text-foreground shrink-0">
                        {item.mediaType}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {item.releaseYear || "TBA"}
                      {item.creator ? ` • ${item.creator}` : ""}
                    </p>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* 1. Queue */}
                    <button
                      type="button"
                      title="Add to Queue"
                      disabled={isPending}
                      onClick={() => logMedia({ media: item, status: "want_to" })}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        currentLoggedStatus === "want_to"
                          ? "bg-amber-400 text-black font-bold"
                          : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                      }`}
                    >
                      <Bookmark className="w-4 h-4 stroke-[2.2]" />
                    </button>

                    {/* 2. In Progress */}
                    <button
                      type="button"
                      title="Currently Playing/Watching"
                      disabled={isPending}
                      onClick={() => logMedia({ media: item, status: "doing" })}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        currentLoggedStatus === "doing"
                          ? "bg-sky-400 text-black font-bold"
                          : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                      }`}
                    >
                      <Play className="w-4 h-4 stroke-[2.2]" />
                    </button>

                    {/* 3. Finished (Opens 5-Star Logger) */}
                    <button
                      type="button"
                      title="Mark as Completed"
                      disabled={isPending}
                      onClick={() => setActiveLoggingId(isLoggingThis ? null : item.externalId)}
                      className={`p-2 rounded-xl transition cursor-pointer ${
                        currentLoggedStatus === "done" || isLoggingThis
                          ? "bg-emerald-500 text-black font-bold"
                          : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted border border-border"
                      }`}
                    >
                      <Check className="w-4 h-4 stroke-[2.2]" />
                    </button>
                  </div>
                </div>

                {/* Inline 5-Star Rating & Review Drawer */}
                {isLoggingThis && (
                  <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2.5 animate-in fade-in-50 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Score:</span>
                      <div className="flex items-center gap-1">
                        {STAR_VALUES.map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setRating(star)}
                            className="p-1 cursor-pointer transition hover:scale-110"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                star <= rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        ))}
                        <span className="text-xs font-black text-amber-500 ml-1.5 font-mono">
                          {rating} / 5
                        </span>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="One-line review or thought (optional)..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full text-xs bg-background border border-border rounded-xl px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none"
                    />

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveLoggingId(null)}
                        className="text-xs px-3 py-1.5 rounded-lg text-muted-foreground hover:text-foreground"
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
                        className="text-xs font-bold px-4 py-1.5 rounded-lg bg-emerald-500 text-black hover:bg-emerald-400 transition"
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
      </div>
    </div>
  );
}
