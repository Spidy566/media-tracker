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
        "bg-[#16161c]/90 hover:bg-[#202028]/95 backdrop-blur-xl border border-white/15 hover:border-brand/40",
        "rounded-2xl p-2 pr-4 sm:pr-5 shadow-2xl shadow-black/80 flex items-center gap-3.5 group cursor-pointer",
        "transition-all duration-300 ease-out select-none outline-none focus-visible:ring-2 focus-visible:ring-brand",
        "animate-in fade-in zoom-in-95 duration-200",
      )}
    >
      {/* Small Poster Thumbnail (~56-64px rounded square) with Crossfade */}
      <div className="size-14 sm:size-16 rounded-xl overflow-hidden relative shrink-0 border border-white/10 bg-neutral-900 shadow-inner">
        {!hidePosters && prevPoster && isCrossfading && (
          <Image
            src={prevPoster}
            alt=""
            fill
            sizes="64px"
            className="object-cover absolute inset-0 transition-opacity duration-300 opacity-0"
          />
        )}

        {!hidePosters && currentPoster ? (
          <Image
            src={currentPoster}
            alt={item.title}
            fill
            sizes="64px"
            className={cn(
              "object-cover transition-opacity duration-300",
              isCrossfading ? "opacity-100" : "opacity-100",
            )}
          />
        ) : (
          <div className="absolute inset-0 bg-[#22222a] flex items-center justify-center text-brand">
            <Sparkles className="size-5" />
          </div>
        )}
      </div>

      {/* Info Stack */}
      <div className="flex flex-col text-left min-w-0 pr-1">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-brand">
          <Sparkles className="size-3 stroke-[2.5]" />
          <span>Anchored</span>
        </div>
        <span className="text-[14px] sm:text-[15px] font-medium text-white truncate max-w-42.5 sm:max-w-65 leading-snug">
          {item.title}
        </span>
        <span className="text-[11px] sm:text-[12px] text-neutral-400 capitalize">
          {item.mediaType} • {item.releaseYear || "TBA"}
        </span>
      </div>

      {/* Hover 'X' Button Indicator */}
      <div
        className="size-7 rounded-full bg-white/10 group-hover:bg-rose-500/25 group-hover:text-rose-400 text-neutral-300 flex items-center justify-center transition-colors shrink-0 ml-1"
        title="Clear anchor"
      >
        <X className="size-3.5 stroke-[2.5]" />
      </div>
    </button>
  );
}
