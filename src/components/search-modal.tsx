"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";

interface SearchModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ userId, isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [trackedIds, setTrackedIds] = useState<Set<string>>(new Set());
  const debouncedQuery = useDebounce(query, 300);
  const queryClient = useQueryClient();

  // Search API query
  const { data, isLoading } = useQuery<{ results: UnifiedSearchResult[] }>({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { results: [] };
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      return res.json();
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  // 1-Click Quick Track Mutation (Zero Popup!)
  const { mutate: quickTrack, isPending } = useMutation({
    mutationFn: async (media: UnifiedSearchResult) => {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          media,
          status: "want_to",
        }),
      });
      if (!res.ok) throw new Error("Failed to track");
      return res.json();
    },
    onSuccess: (_, media) => {
      // Mark as tracked locally for instant visual feedback
      setTrackedIds((prev) => new Set(prev).add(media.externalId));
      // Invalidate queries so feed and stash update immediately
      queryClient.invalidateQueries({ queryKey: ["entries"] });
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-xs flex items-start justify-center pt-16 p-4">
      <div className="bg-[#141820] text-white border border-white/10 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[75vh] overflow-hidden">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-white/10 flex items-center gap-3">
          <Input
            autoFocus
            placeholder="Search movies, TV shows, games..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="text-base h-11 bg-white/5 border-white/10 text-white placeholder:text-muted-foreground"
          />
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-muted-foreground hover:text-white"
          >
            Esc
          </Button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && (
            <p className="text-center text-xs text-muted-foreground py-8">
              Searching TMDB & IGDB...
            </p>
          )}

          {!isLoading && data?.results?.length === 0 && debouncedQuery.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-8">
              No results found for &quot;{query}&quot;
            </p>
          )}

          {data?.results?.map((item) => {
            const isTracked = trackedIds.has(item.externalId);

            return (
              <div
                key={item.externalId}
                className="flex items-center gap-4 p-2.5 rounded-xl hover:bg-white/5 transition border border-transparent hover:border-white/5"
              >
                {item.posterUrl ? (
                  <Image
                    src={item.posterUrl}
                    alt={item.title}
                    width={48}
                    height={72}
                    className="rounded-lg object-cover aspect-2/3 w-12 border border-white/10"
                  />
                ) : (
                  <div className="w-12 aspect-2/3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-[10px] text-muted-foreground uppercase font-bold">
                    No Art
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white truncate">{item.title}</h3>
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase border-white/10 bg-white/5 text-white/70"
                    >
                      {item.mediaType}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {item.releaseYear || "Unknown Year"}
                    {item.creator ? ` • ${item.creator}` : ""}
                  </p>
                </div>

                {/* Instant 1-Click Track Button */}
                <Button
                  size="sm"
                  variant={isTracked ? "secondary" : "outline"}
                  disabled={isTracked || isPending}
                  onClick={() => quickTrack(item)}
                  className={`text-xs h-8 px-3 shrink-0 ${
                    isTracked
                      ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                      : "border-white/10 bg-white/5 hover:bg-white/10 text-white"
                  }`}
                >
                  {isTracked ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1" /> In Stash
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 mr-1" /> Track
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
