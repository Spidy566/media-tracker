"use client";

import { Bookmark, Check, Play, Sparkles } from "lucide-react";
import Link from "next/link";
import type { CalendarItem } from "@/app/api/calendar/route";
import { PosterImage } from "@/components/poster-image";
import { ScrollRow } from "@/components/scroll-row";
import type { MediaStatus } from "@/db/schema";
import { parseYMD } from "@/lib/calendar-dates";
import { getMediaHref } from "@/lib/utils";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface CalendarHighlightsProps {
  highlights: CalendarItem[];
  myStatus: Record<string, MediaStatus>;
  todayYmd: string;
  isMutatingStatus?: boolean;
  onSelectDay: (ymd: string) => void;
  onQuickStatus: (media: CalendarItem, status: "want_to" | "doing" | "done") => void;
}

export function CalendarHighlights({
  highlights,
  myStatus,
  todayYmd,
  isMutatingStatus = false,
  onSelectDay,
  onQuickStatus,
}: CalendarHighlightsProps) {
  if (highlights.length < 4) return null;

  return (
    <ScrollRow
      title={
        <div className="flex items-center gap-2">
          <Sparkles className="size-4.5 text-brand" />
          <span className="text-lg sm:text-xl font-semibold tracking-tight text-foreground font-sans">
            Biggest releases
          </span>
        </div>
      }
    >
      {highlights.map((item) => {
        const itemStatus = myStatus[item.externalId];
        const isFuture = item.releaseDate ? item.releaseDate > todayYmd : true;

        let dateBadge = "TBA";
        if (item.releaseDate) {
          const d = parseYMD(item.releaseDate);
          dateBadge = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
        }

        return (
          <div
            key={`highlight-${item.externalId}`}
            className="w-36 sm:w-44 shrink-0 snap-start flex flex-col group select-none"
          >
            {/* Poster card container */}
            <div className="relative aspect-2/3 w-full rounded-2xl overflow-hidden bg-muted border border-border group-hover:border-foreground/30 group-hover:shadow-lg transition-all duration-200">
              <Link
                href={getMediaHref(item)}
                className="absolute inset-0 z-0 w-full h-full cursor-pointer focus:outline-none"
                aria-label={`View details for ${item.title}`}
              />

              <PosterImage
                src={item.posterUrl}
                title={item.title}
                mediaType={item.mediaType}
                sizes="(max-width: 640px) 144px, 176px"
                className="object-cover transition duration-300 group-hover:scale-103 pointer-events-none"
              />

              {/* Top floating date badge & status dot */}
              <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (item.releaseDate) {
                      onSelectDay(item.releaseDate);
                    }
                  }}
                  className="pointer-events-auto bg-background/90 hover:bg-background text-foreground font-semibold font-mono tabular-nums text-[10px] px-2 py-0.5 rounded-full border border-border shadow-xs transition cursor-pointer"
                  title={item.releaseDate ? `View ${item.releaseDate}` : "Date TBA"}
                >
                  {dateBadge}
                </button>

                {itemStatus && (
                  <span
                    className={`size-2.5 rounded-full border border-background shadow-xs pointer-events-auto ${
                      itemStatus === "want_to"
                        ? "bg-status-queue"
                        : itemStatus === "doing"
                          ? "bg-status-doing"
                          : itemStatus === "done"
                            ? "bg-status-done"
                            : "bg-status-dropped"
                    }`}
                    title={`Status: ${itemStatus}`}
                  />
                )}
              </div>

              {/* Quick status actions */}
              <div className="absolute bottom-2 inset-x-2 z-20 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150">
                <div className="flex items-center gap-0.5 bg-background/95 backdrop-blur-md p-1 rounded-full border border-border shadow-lg">
                  <button
                    type="button"
                    title="Add to Queue"
                    disabled={isMutatingStatus}
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickStatus(item, "want_to");
                    }}
                    className={`p-1.5 rounded-full transition cursor-pointer ${
                      itemStatus === "want_to"
                        ? "bg-status-queue/20 text-status-queue border border-status-queue/40 font-bold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <Bookmark className="size-3.5" />
                  </button>
                  {!isFuture && (
                    <>
                      <button
                        type="button"
                        title="In Progress"
                        disabled={isMutatingStatus}
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickStatus(item, "doing");
                        }}
                        className={`p-1.5 rounded-full transition cursor-pointer ${
                          itemStatus === "doing"
                            ? "bg-status-doing/20 text-status-doing border border-status-doing/40 font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <Play className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Done"
                        disabled={isMutatingStatus}
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickStatus(item, "done");
                        }}
                        className={`p-1.5 rounded-full transition cursor-pointer ${
                          itemStatus === "done"
                            ? "bg-status-done/20 text-status-done border border-status-done/40 font-bold"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        }`}
                      >
                        <Check className="size-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Title and metadata */}
            <div className="flex flex-col min-w-0 mt-2">
              <h4 className="text-xs font-semibold text-foreground truncate group-hover:opacity-85 transition font-sans">
                {item.title}
              </h4>
              <p className="text-[11px] text-muted-foreground capitalize mt-0.5 font-mono">
                {item.mediaType === "tv" ? "TV series" : item.mediaType}
              </p>
            </div>
          </div>
        );
      })}
    </ScrollRow>
  );
}
