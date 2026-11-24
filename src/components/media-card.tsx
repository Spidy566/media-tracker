"use client";

import { Bookmark, Check, Film, Gamepad2, Play, Tv } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePosters } from "@/components/providers/poster-provider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { MediaStatus } from "@/db/schema";
import { cn } from "@/lib/utils";

export type { MediaStatus };

export interface MediaCardProps {
  title: string;
  mediaType: "movie" | "tv" | "game";
  posterUrl: string | null;
  releaseYear?: number | null;
  href?: string;
  currentStatus?: MediaStatus | null;
  /** Progress percentage (0 - 100) for in-progress items */
  progressPercent?: number | null;
  /** Progress text label (e.g. "S2 · E4", "42%") */
  progressText?: string | null;
  /** Active library tab context: "all" displays action row on touch devices */
  activeTab?: string;
  onQuickStatus?: (status: "want_to" | "doing" | "done") => void;
  onRemove?: () => void;
  onClick?: () => void;
  priority?: boolean;
  // Legacy / optional props preserved for compatibility across existing callers
  rating?: number | null;
  subtitle?: string | null;
  badge?: React.ReactNode;
  showStatusDot?: boolean;
  allowedStatuses?: ("want_to" | "doing" | "done")[];
  isAnchored?: boolean;
  onAnchor?: () => void;
}

export function MediaCard({
  title,
  mediaType,
  posterUrl,
  releaseYear,
  href,
  currentStatus = null,
  progressPercent = null,
  activeTab,
  onQuickStatus,
  onClick,
  priority = false,
}: MediaCardProps) {
  const { hidePosters } = usePosters();
  const [imgError, setImgError] = useState(false);

  // Status mapping to data-status attribute
  const statusAttribute =
    currentStatus === "want_to"
      ? "queue"
      : currentStatus === "doing"
        ? "progress"
        : currentStatus === "done"
          ? "done"
          : "none";

  // Medium icon for fallback tile
  const MediumIcon = mediaType === "tv" ? Tv : mediaType === "game" ? Gamepad2 : Film;

  // In-progress bar fill
  const clampedProgress =
    typeof progressPercent === "number" && !Number.isNaN(progressPercent)
      ? Math.max(0, Math.min(100, progressPercent))
      : 0;

  // Touch device visibility: show quick-access bar always only on "all" tab
  const touchActionClasses = activeTab === "all" ? "[@media(hover:none)]:opacity-100" : "";

  const isPosterHidden = hidePosters || !posterUrl || imgError;
  const fullTitle = `${title}${releaseYear ? ` (${releaseYear})` : ""}`;

  return (
    <TooltipProvider delayDuration={350}>
      <article
        data-status={statusAttribute}
        className="group relative flex flex-col w-full select-none"
      >
        {/* 2:3 Poster Frame (Clean Letterboxd hairline border, zero jump, zero gloss) */}
        <div className="relative aspect-2/3 w-full overflow-hidden rounded-md bg-[#16181D]">
          {/* Poster Artwork or Missing/Stealth Poster Tile */}
          {!isPosterHidden ? (
            <Image
              src={posterUrl}
              alt={`Poster for ${fullTitle}`}
              width={300}
              height={450}
              loading={priority ? undefined : "lazy"}
              priority={priority}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover rounded-md"
              sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 15vw"
            />
          ) : (
            <div className="flex h-full w-full flex-col justify-between p-3.5 bg-[#16181D] border border-white/8 select-none rounded-md">
              <div className="flex items-center justify-between text-[#A1A5AD]">
                <MediumIcon className="size-4 opacity-75 shrink-0" strokeWidth={1.5} />
                {releaseYear && (
                  <span className="text-[11px] font-mono opacity-60">{releaseYear}</span>
                )}
              </div>
              <div className="my-auto py-2">
                <span className="font-semibold text-[#ECEDEF] text-[13px] leading-snug line-clamp-3 text-balance text-left block">
                  {title}
                </span>
              </div>
              <div className="w-6 h-0.5 rounded-full bg-white/20" />
            </div>
          )}

          {/* Letterboxd Hairline Ring: clean inset border */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-10 rounded-md ring-1 ring-inset ring-white/10 transition-colors duration-150 group-hover:ring-white/25 group-focus-within:ring-white/25"
          />

          {/* In Progress items: 3px progress bar flush to bottom edge */}
          {currentStatus === "doing" && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-15 h-[3px] bg-white/10"
            >
              <div
                className="h-full bg-[#E3A94B] transition-all duration-300"
                style={{ width: `${clampedProgress}%` }}
              />
            </div>
          )}

          {/* Clean Letterboxd flat dark veil on hover */}
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 z-10 bg-black/40 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100",
              touchActionClasses,
            )}
          />

          {/* Primary Stretched Navigation Link with shadcn Tooltip for title */}
          <Tooltip>
            <TooltipTrigger asChild>
              {href ? (
                <Link
                  href={href}
                  aria-label={fullTitle}
                  className="absolute inset-0 z-10 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#7B7FEB]/60"
                />
              ) : onClick ? (
                <button
                  type="button"
                  aria-label={fullTitle}
                  onClick={onClick}
                  className="absolute inset-0 z-10 w-full h-full cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-[#7B7FEB]/60"
                />
              ) : (
                <div className="absolute inset-0 z-10 rounded-md" />
              )}
            </TooltipTrigger>
            <TooltipContent side="top" sideOffset={6}>
              {fullTitle}
            </TooltipContent>
          </Tooltip>

          {/* Clean Backloggd-style Icon Row: only status action icons */}
          {onQuickStatus && (
            <div
              className={cn(
                "pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
                touchActionClasses,
                activeTab === "all" ? "[@media(hover:none)]:pointer-events-auto" : "",
              )}
            >
              <div className="flex items-center gap-1 rounded-full bg-[#0B0C0F] p-1 border border-white/15">
                {/* Button 1: Queue Action */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Queue"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickStatus("want_to");
                      }}
                      className={cn(
                        "grid size-7.5 place-items-center rounded-full transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7B7FEB]/60",
                        currentStatus === "want_to"
                          ? "bg-white/20 text-[#ECEDEF]"
                          : "text-[#A1A5AD] hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Bookmark className="size-3.5" strokeWidth={1.75} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    {currentStatus === "want_to" ? "In Queue" : "Queue"}
                  </TooltipContent>
                </Tooltip>

                {/* Button 2: Start (In Progress) Action */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="In Progress"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickStatus("doing");
                      }}
                      className={cn(
                        "grid size-7.5 place-items-center rounded-full transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7B7FEB]/60",
                        currentStatus === "doing"
                          ? "bg-[#E3A94B]/20 text-[#E3A94B]"
                          : "text-[#A1A5AD] hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Play className="size-3.5" strokeWidth={1.75} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    {currentStatus === "doing" ? "Playing / Watching" : "In Progress"}
                  </TooltipContent>
                </Tooltip>

                {/* Button 3: Completed / Done Action */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label="Done"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickStatus("done");
                      }}
                      className={cn(
                        "grid size-7.5 place-items-center rounded-full transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#7B7FEB]/60",
                        currentStatus === "done"
                          ? "bg-[#4FB286]/20 text-[#4FB286]"
                          : "text-[#A1A5AD] hover:bg-white/10 hover:text-white",
                      )}
                    >
                      <Check className="size-3.5" strokeWidth={2} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" sideOffset={8}>
                    {currentStatus === "done" ? "Completed" : "Done"}
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
        </div>
      </article>
    </TooltipProvider>
  );
}
