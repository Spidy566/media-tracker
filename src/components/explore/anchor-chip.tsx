"use client";

import { Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { usePosters } from "@/components/providers/poster-provider";
import { cn } from "@/lib/utils";

interface AnchorChipProps {
  item: UnifiedSearchResult;
  onClear: () => void;
}

export function AnchorChip({ item, onClear }: AnchorChipProps) {
  const { hidePosters } = usePosters();

  // Crossfade image state when anchor changes without unmounting component
  const [currentPoster, setCurrentPoster] = useState(item.posterUrl);
  const [prevPoster, setPrevPoster] = useState<string | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);

  useEffect(() => {
    if (item.posterUrl !== currentPoster) {
      setPrevPoster(currentPoster);
      setCurrentPoster(item.posterUrl);
      setIsCrossfading(true);
      const timer = setTimeout(() => {
        setIsCrossfading(false);
        setPrevPoster(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [item.posterUrl, currentPoster]);

  return (
    <button
      type="button"
      onClick={onClear}
      aria-label={`Clear anchor: ${item.title}`}
      title="Click or press Esc to clear anchor"
      className={cn(
        "fixed bottom-24 md:bottom-10 left-1/2 -translate-x-1/2 z-50",
        "bg-card/90 hover:bg-muted/95 backdrop-blur-xl border border-border hover:border-brand/40",
        "rounded-2xl p-2 pr-4 sm:pr-5 shadow-2xl shadow-black/80 flex items-center gap-3.5 group cursor-pointer",
        "transition-all duration-300 ease-out select-none outline-none focus-visible:ring-2 focus-visible:ring-brand",
        "animate-in fade-in zoom-in-95 duration-200",
      )}
    >
      {/* Small Poster Thumbnail (~56-64px rounded square) with Crossfade */}
      <div className="relative size-12 sm:size-14 rounded-xl overflow-hidden bg-muted border border-border shrink-0 shadow-inner">
        {hidePosters ? (
          <div className="w-full h-full flex items-center justify-center bg-card text-brand font-bold text-base">
            <Sparkles className="size-5" />
          </div>
        ) : (
          <>
            {prevPoster && isCrossfading && (
              <Image
                src={prevPoster}
                alt=""
                fill
                sizes="56px"
                className="object-cover absolute inset-0 z-0 opacity-100 transition-opacity duration-300 ease-out"
              />
            )}
            {currentPoster && (
              <Image
                src={currentPoster}
                alt={item.title}
                fill
                sizes="56px"
                className={cn(
                  "object-cover absolute inset-0 z-10 transition-opacity duration-300 ease-in",
                  isCrossfading
                    ? "opacity-0 animate-in fade-in duration-300 fill-mode-forwards"
                    : "opacity-100",
                )}
              />
            )}
          </>
        )}
      </div>

      {/* Center Text Block */}
      <div className="flex flex-col text-left min-w-0 pr-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-brand tracking-wide">
          <Sparkles className="size-3 shrink-0" />
          <span className="uppercase font-mono text-[10px]">Anchor</span>
        </div>
        <span className="text-xs sm:text-sm font-semibold text-foreground truncate max-w-[180px] sm:max-w-[240px]">
          {item.title}
        </span>
        <span className="text-[11px] text-muted-foreground truncate hidden sm:inline">
          Showing related titles
        </span>
      </div>

      {/* Right Close / Clear Button */}
      <div className="size-7 rounded-full bg-muted/80 group-hover:bg-muted border border-border/60 flex items-center justify-center text-muted-foreground group-hover:text-foreground transition-colors shrink-0 ml-1">
        <X className="size-3.5" />
      </div>
    </button>
  );
}
