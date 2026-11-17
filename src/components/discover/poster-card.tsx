"use client";

import {
  Bookmark,
  Check,
  ExternalLink,
  Heart,
  MoreHorizontal,
  Play,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { PosterImage } from "@/components/poster-image";
import { usePosters } from "@/components/providers/poster-provider";
import type { MediaStatus } from "@/db/schema";
import { getStatusBadgeClasses, getStatusLabel, MediaTypeIcon } from "@/lib/media-formatters";
import { cn, getMediaHref } from "@/lib/utils";

export type { MediaStatus };

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
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const isFavorited = trackedStatus === "want_to";
  const mediaHref = getMediaHref(item);

  return (
    <div
      className={cn(
        "group relative aspect-2/3 w-full rounded-2xl overflow-hidden select-none transition-all duration-300",
        dense ? "rounded-xl" : "rounded-2xl",
        isAnchored
          ? "scale-[1.03] z-30 ring-2 ring-brand shadow-2xl shadow-brand/20 opacity-100"
          : isDimmed
            ? "opacity-20 grayscale-85 filter blur-[1.5px] scale-[0.98] pointer-events-auto hover:opacity-85 hover:grayscale-0 hover:blur-none hover:scale-100"
            : "opacity-100 hover:scale-[1.025] shadow-md hover:shadow-xl border border-border bg-card",
      )}
    >
      {/* Primary Click Target: Links cleanly to /media/[type]/[id] */}
      <Link
        href={mediaHref}
        aria-label={`View details for ${item.title}`}
        className="absolute inset-0 z-0 h-full w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-inset"
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
        <div className="pointer-events-none absolute inset-0 bg-card p-3 flex flex-col justify-between border border-border">
          <div className="flex items-center justify-between text-muted-foreground text-[11px] font-medium uppercase tracking-wider font-mono">
            <span className="flex items-center gap-1">
              <MediaTypeIcon type={item.mediaType} className="size-3.5 shrink-0" />
              <span className="capitalize">{item.mediaType}</span>
            </span>
            <span className="tabular-nums">{item.releaseYear || "TBA"}</span>
          </div>
          <div className="my-auto py-2">
            <span className="font-medium text-foreground text-[13px] sm:text-[14px] leading-snug line-clamp-3">
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
              getStatusBadgeClasses(trackedStatus),
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

      {/* Hover Scrim & Action Overlays */}
      <div
        className={cn(
          "absolute inset-0 bg-linear-to-t from-black/90 via-black/40 to-transparent p-2.5 sm:p-3 flex flex-col justify-between transition-opacity duration-200 pointer-events-none",
          isAnchored || menuOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
      >
        {/* Top-Right: "Find Similar" (Anchor) & "+ Log" Buttons */}
        <div className="flex justify-end items-center gap-1.5 w-full">
          {/* Subtle Find Similar (Sparkles) button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAnchor(item);
            }}
            aria-label={`Find titles similar to ${item.title}`}
            title="Find similar titles"
            className={cn(
              "pointer-events-auto px-2 py-1 rounded-full border text-[11px] font-medium transition cursor-pointer backdrop-blur-md shadow-md flex items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-brand",
              isAnchored
                ? "bg-brand text-brand-foreground border-brand"
                : "bg-card/80 hover:bg-muted text-foreground border-border",
            )}
          >
            <Sparkles className="size-3" />
            <span className="hidden sm:inline">Similar</span>
          </button>

          {/* Quick "+ Log" Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onStatusChange(item, "want_to");
            }}
            aria-label={`Log ${item.title}`}
            title="Add to Queue"
            className="pointer-events-auto px-2 py-1 rounded-full bg-card/80 hover:bg-brand hover:text-brand-foreground text-foreground border border-border text-[11px] font-medium transition cursor-pointer backdrop-blur-md shadow-md flex items-center gap-1 outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <Plus className="size-3 stroke-[2.5]" />
            <span>Log</span>
          </button>
        </div>

        {/* Bottom Area: Title, Year, Heart, and "..." Menu */}
        <div className="space-y-1.5">
          <Link
            href={mediaHref}
            className="font-semibold text-white text-[13px] sm:text-[14px] leading-tight line-clamp-2 block hover:text-brand transition-colors drop-shadow-sm pointer-events-auto"
          >
            {item.title}
          </Link>

          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[11px] sm:text-[12px] text-muted-foreground font-mono tabular-nums">
              {item.releaseYear || "TBA"}
            </span>

            {/* Bottom-Right Controls: Heart & "..." Menu */}
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {/* Heart Button (adds to want_to) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onStatusChange(item, "want_to");
                }}
                aria-label={`Want to watch/play ${item.title}`}
                title={isFavorited ? "Saved in Queue" : "Add to Queue"}
                className={cn(
                  "p-1.5 rounded-full border backdrop-blur-md transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand",
                  isFavorited
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                    : "bg-card/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border",
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
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen((prev) => !prev);
                  }}
                  aria-label={`Options for ${item.title}`}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  title="More actions"
                  className="p-1.5 rounded-full bg-card/80 hover:bg-muted text-muted-foreground hover:text-foreground border border-border backdrop-blur-md transition cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <MoreHorizontal className="size-3.5" />
                </button>

                {/* Dropdown Menu */}
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 bottom-full mb-2 w-48 rounded-xl bg-popover/95 backdrop-blur-xl border border-border shadow-2xl p-1.5 z-50 text-foreground text-[12px] animate-in fade-in zoom-in-95 duration-150"
                  >
                    {/* View Details Link */}
                    <Link
                      href={mediaHref}
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(false);
                      }}
                      role="menuitem"
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      <span>View details</span>
                      <ExternalLink className="size-3 text-muted-foreground" />
                    </Link>

                    {/* Find Similar Action */}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(false);
                        onAnchor(item);
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted hover:text-foreground transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span>Find similar</span>
                      <Sparkles className="size-3 text-muted-foreground" />
                    </button>

                    <div className="my-1 border-t border-border" />

                    <div className="px-2.5 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      Set Status
                    </div>

                    {(["want_to", "doing", "done", "dropped"] as const).map((status) => (
                      <button
                        key={status}
                        type="button"
                        role="menuitem"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMenuOpen(false);
                          onStatusChange(item, status);
                        }}
                        className={cn(
                          "w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-muted transition-colors flex items-center justify-between cursor-pointer",
                          trackedStatus === status
                            ? "text-brand font-medium"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span>{getStatusLabel(status)}</span>
                        {trackedStatus === status && <Check className="size-3 stroke-[2.5]" />}
                      </button>
                    ))}

                    {trackedStatus && onRemoveTracked && (
                      <>
                        <div className="my-1 border-t border-border" />
                        <button
                          type="button"
                          role="menuitem"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setMenuOpen(false);
                            onRemoveTracked(item);
                          }}
                          className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-destructive/20 text-destructive transition-colors flex items-center gap-1.5 cursor-pointer"
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
