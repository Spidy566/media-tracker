"use client";

import {
  Bookmark,
  Check,
  ExternalLink,
  Film,
  Gamepad2,
  Heart,
  MoreHorizontal,
  Play,
  Plus,
  Tv,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { PosterImage } from "@/components/poster-image";
import { usePosters } from "@/components/providers/poster-provider";
import { cn } from "@/lib/utils";

export type MediaStatus = "want_to" | "doing" | "done" | "dropped";

interface PosterCardProps {
  item: UnifiedSearchResult;
  isAnchored?: boolean;
  isDimmed?: boolean;
  trackedStatus?: MediaStatus | null;
  onAnchor: (item: UnifiedSearchResult) => void;
  onStatusChange: (item: UnifiedSearchResult, status: MediaStatus) => void;
  onRemoveTracked?: (item: UnifiedSearchResult) => void;
  dense?: boolean;
}

function getMediaHref(item: { externalId: string; mediaType: string }) {
  const parts = item.externalId.split(":");
  if (parts[0] === "tmdb") {
    return `/media/${parts[1]}/${parts[2]}`;
  }
  if (parts[0] === "igdb") {
    return `/media/game/${parts[1]}`;
  }
  return `/media/${item.mediaType}/${item.externalId}`;
}

function getMediaTypeIcon(type: string) {
  switch (type) {
    case "movie":
      return <Film className="size-3.5 shrink-0" />;
    case "tv":
      return <Tv className="size-3.5 shrink-0" />;
    case "game":
      return <Gamepad2 className="size-3.5 shrink-0" />;
    default:
      return null;
  }
}

function getStatusLabel(status: MediaStatus) {
  switch (status) {
    case "want_to":
      return "Want to";
    case "doing":
      return "Doing";
    case "done":
      return "Done";
    case "dropped":
      return "Dropped";
  }
}

function getStatusColorClasses(status: MediaStatus) {
  switch (status) {
    case "want_to":
      return "bg-[#3F6FD8] text-white border-blue-400/30";
    case "doing":
      return "bg-[#D4580F] text-white border-orange-400/30";
    case "done":
      return "bg-[#1E9467] text-white border-emerald-400/30";
    case "dropped":
      return "bg-[#6B6B76] text-white border-neutral-400/30";
  }
}

export function PosterCard({
  item,
  isAnchored = false,
  isDimmed = false,
  trackedStatus = null,
  onAnchor,
  onStatusChange,
  onRemoveTracked,
  dense = false,
}: PosterCardProps) {
  const { hidePosters } = usePosters();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside or Esc
  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const isFavorited = trackedStatus === "want_to";

  return (
    <div
      className={cn(
        "group relative aspect-2/3 w-full rounded-xl overflow-hidden select-none transition-all duration-300",
        dense ? "rounded-lg" : "rounded-xl",
        isAnchored
          ? "scale-[1.03] z-30 ring-2 ring-brand shadow-2xl shadow-brand/20 opacity-100"
          : isDimmed
            ? "opacity-20 grayscale-85 filter blur-[1.5px] scale-[0.98] pointer-events-auto hover:opacity-85 hover:grayscale-0 hover:blur-none hover:scale-100"
            : "opacity-100 hover:scale-[1.025] shadow-md hover:shadow-xl border border-white/8",
      )}
    >
      {/* Anchor Click Target Overlay Button */}
      <button
        type="button"
        onClick={() => onAnchor(item)}
        aria-label={`Select ${item.title}`}
        className="absolute inset-0 z-0 h-full w-full cursor-pointer bg-transparent border-0 p-0 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
      />

      {/* Poster Artwork or Stealth Tile */}
      <PosterImage
        src={item.posterUrl}
        title={item.title}
        mediaType={item.mediaType as "movie" | "tv" | "game"}
        releaseYear={item.releaseYear}
        sizes={
          dense
            ? "(max-width: 640px) 33vw, (max-width: 1024px) 20vw, 12vw"
            : "(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
        }
        className="object-cover transition-transform duration-300 pointer-events-none"
      />

      {/* Stealth Mode fallback content if posters are hidden */}
      {hidePosters && (
        <div className="pointer-events-none absolute inset-0 bg-[#16161c] p-3 flex flex-col justify-between border border-white/8">
          <div className="flex items-center justify-between text-neutral-400 text-[11px] font-medium uppercase tracking-wider">
            <span className="flex items-center gap-1">
              {getMediaTypeIcon(item.mediaType)}
              <span>{item.mediaType}</span>
            </span>
            <span>{item.releaseYear || "TBA"}</span>
          </div>
          <div className="my-auto py-2">
            <span className="font-medium text-white text-[13px] sm:text-[14px] leading-snug line-clamp-3">
              {item.title}
            </span>
          </div>
          <div className="h-0.5 w-6 bg-brand/60 rounded-full" />
        </div>
      )}

      {/* Top Left: Tracked Status Badge (visible if already tracked) */}
      {trackedStatus && (
        <div className="absolute top-2.5 left-2.5 z-10 pointer-events-none">
          <span
            className={cn(
              "px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium border shadow-md backdrop-blur-md inline-flex items-center gap-1",
              getStatusColorClasses(trackedStatus),
            )}
          >
            {trackedStatus === "want_to" && <Bookmark className="size-2.5 stroke-[2.5]" />}
            {trackedStatus === "doing" && <Play className="size-2.5 fill-current" />}
            {trackedStatus === "done" && <Check className="size-2.5 stroke-[2.5]" />}
            {trackedStatus === "dropped" && <X className="size-2.5 stroke-[2.5]" />}
            <span>{getStatusLabel(trackedStatus)}</span>
          </span>
        </div>
      )}

      {/* Hover Scrim & Action Overlays (opacity transition only) */}
      <div
        className={cn(
          "absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent p-2.5 sm:p-3 flex flex-col justify-between transition-opacity duration-200 pointer-events-none",
          isAnchored || menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        {/* Top-Right: "+ Log" Button */}
        <div className="flex justify-end items-center gap-1.5 w-full">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStatusChange(item, "want_to");
            }}
            aria-label={`Log ${item.title}`}
            title="Log / Save"
            className="pointer-events-auto px-2.5 py-1 rounded-full bg-white/20 hover:bg-brand hover:text-brand-foreground text-white border border-white/20 text-[11px] font-medium transition cursor-pointer backdrop-blur-md shadow-md flex items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Plus className="size-3 stroke-[2.5]" />
            <span>Log</span>
          </button>
        </div>

        {/* Bottom Area: Title, Year, Heart, and "..." Menu */}
        <div className="space-y-1.5">
          <span className="font-semibold text-white text-[13px] sm:text-[14px] leading-tight line-clamp-2 block drop-shadow-sm">
            {item.title}
          </span>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[11px] sm:text-[12px] text-neutral-300">
              {item.releaseYear || "TBA"}
            </span>

            {/* Bottom-Right Controls: Heart & "..." Menu */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {/* Heart Button (adds to want_to) */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStatusChange(item, "want_to");
                }}
                aria-label={`Want to watch/play ${item.title}`}
                title={isFavorited ? "Saved in Queue" : "Add to Queue"}
                className={cn(
                  "p-1.5 rounded-full border backdrop-blur-md transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  isFavorited
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                    : "bg-black/60 hover:bg-white/20 text-neutral-300 hover:text-white border-white/15",
                )}
              >
                <Heart
                  className={cn("size-3.5", isFavorited && "fill-rose-400 text-rose-400")}
                  strokeWidth={2}
                />
              </button>

              {/* "..." Menu Button */}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen((prev) => !prev);
                  }}
                  aria-label={`Options for ${item.title}`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  title="More actions"
                  className="p-1.5 rounded-full bg-black/60 hover:bg-white/20 text-neutral-300 hover:text-white border border-white/15 backdrop-blur-md transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <MoreHorizontal className="size-3.5" />
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 bottom-full mb-2 w-48 rounded-xl bg-[#1c1c22]/95 backdrop-blur-xl border border-white/15 shadow-2xl p-1.5 z-50 text-neutral-200 text-[12px] animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* View Details Link */}
                    <Link
                      href={getMediaHref(item)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                      }}
                      role="menuitem"
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                    >
                      <span>View details</span>
                      <ExternalLink className="size-3 text-neutral-400" />
                    </Link>

                    <div className="my-1 border-t border-white/10" />

                    <div className="px-2.5 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Set Status
                    </div>

                    {(["want_to", "doing", "done", "dropped"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        role="menuitem"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onStatusChange(item, status);
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between cursor-pointer",
                          trackedStatus === status ? "text-brand font-medium" : "text-neutral-300",
                        )}
                      >
                        <span>{getStatusLabel(status)}</span>
                        {trackedStatus === status && <Check className="size-3 stroke-[2.5]" />}
                      </button>
                    ))}

                    {trackedStatus && onRemoveTracked && (
                      <>
                        <div className="my-1 border-t border-white/10" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpen(false);
                            onRemoveTracked(item);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <X className="size-3.5" />
                          <span>Remove from library</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
