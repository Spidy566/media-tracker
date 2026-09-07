"use client";

import { useState } from "react";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrackDialog } from "@/components/track-dialog";
import type { UnifiedSearchResult } from "@/app/api/search/route";

interface SearchModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ userId, isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<UnifiedSearchResult | null>(null);
  const debouncedQuery = useDebounce(query, 300);

  const { data, isLoading } = useQuery<{ results: UnifiedSearchResult[] }>({
    queryKey: ["search", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return { results: [] };
      const res = await fetch(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
      return res.json();
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4">
        <div className="bg-card text-card-foreground w-full max-w-2xl rounded-xl shadow-2xl border flex flex-col max-h-[75vh] overflow-hidden">
          <div className="p-4 border-b flex items-center gap-3">
            <Input
              autoFocus
              placeholder="Search movies, TV shows, games..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="text-base h-11"
            />
            <Button variant="ghost" onClick={onClose}>
              Esc
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {isLoading && <p className="text-center text-muted-foreground py-8">Searching across everything...</p>}

            {!isLoading && data?.results?.length === 0 && debouncedQuery.length > 0 && (
              <p className="text-center text-muted-foreground py-8">No results found for &quot;{query}&quot;</p>
            )}

            {data?.results?.map((item) => (
              <div
                key={item.externalId}
                className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 transition cursor-pointer"
                onClick={() => setSelectedMedia(item)}
              >
                {item.posterUrl ? (
                  <Image
                    src={item.posterUrl}
                    alt={item.title}
                    width={48}
                    height={72}
                    className="rounded object-cover aspect-[2/3] w-12"
                  />
                ) : (
                  <div className="w-12 aspect-[2/3] bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                    Art
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate text-sm">{item.title}</h3>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {item.mediaType}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {item.releaseYear || "Unknown Year"}
                    {item.creator ? ` • ${item.creator}` : ""}
                  </p>
                </div>

                <Button size="sm" variant="outline">
                  + Track
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedMedia && (
        <TrackDialog
          media={selectedMedia}
          userId={userId}
          onClose={() => {
            setSelectedMedia(null);
            onClose();
          }}
        />
      )}
    </>
  );
}