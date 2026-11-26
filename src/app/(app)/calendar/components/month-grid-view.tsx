"use client";

import { useRef, useState } from "react";
import { PosterImage } from "@/components/poster-image";
import { usePosters } from "@/components/providers/poster-provider";
import type { MediaStatus } from "@/db/schema";
import type { MonthCell } from "@/lib/calendar-dates";
import type { CalendarItem } from "@/types/calendar";

export const WEEKDAYS_HEADER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface MonthGridViewProps {
  monthGridCells: MonthCell[];
  dayGroups: Record<string, CalendarItem[]>;
  monthTitle: string;
  todayYmd: string;
  myStatus: Record<string, MediaStatus>;
  onSelectDay: (ymd: string) => void;
}

export function MonthGridView({
  monthGridCells,
  dayGroups,
  monthTitle,
  todayYmd,
  myStatus,
  onSelectDay,
}: MonthGridViewProps) {
  const { hidePosters } = usePosters();
  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [focusedCellIndex, setFocusedCellIndex] = useState<number | null>(null);

  const handleCellKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        nextIndex = Math.max(0, index - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        nextIndex = Math.min(monthGridCells.length - 1, index + 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        nextIndex = Math.max(0, index - 7);
        break;
      case "ArrowDown":
        e.preventDefault();
        nextIndex = Math.min(monthGridCells.length - 1, index + 7);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (monthGridCells[index]?.inMonth) {
          onSelectDay(monthGridCells[index].ymd);
        }
        return;
      default:
        return;
    }

    if (nextIndex >= 0 && nextIndex < monthGridCells.length) {
      setFocusedCellIndex(nextIndex);
      cellRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div className="hidden md:block space-y-2">
      {/* Weekday Header Row */}
      <div className="grid grid-cols-7 gap-2 pb-1 text-center">
        {WEEKDAYS_HEADER.map((w) => (
          <span
            key={w}
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-sans"
          >
            {w}
          </span>
        ))}
      </div>

      {/* 6 rows of 7 cells (42 cells total) */}
      <section aria-label="Month releases grid" className="grid grid-cols-7 gap-2">
        {monthGridCells.map((cell, index) => {
          if (!cell.inMonth) {
            return (
              <div
                key={cell.ymd}
                aria-hidden="true"
                className="min-h-28 rounded-xl border border-dashed border-border/30 bg-muted/10 pointer-events-none select-none opacity-40"
              />
            );
          }

          const dayItems = dayGroups[cell.ymd] || [];
          const releaseCount = dayItems.length;
          const isToday = cell.ymd === todayYmd;
          const isPast = cell.ymd < todayYmd;
          const hasMyItem = dayItems.some((item) => Boolean(myStatus[item.externalId]));
          const isFocused = index === focusedCellIndex;

          const cellAriaLabel = `${cell.dayNumber} ${monthTitle.split(" ")[0]}, ${releaseCount} ${
            releaseCount === 1 ? "release" : "releases"
          }`;

          return (
            <button
              key={cell.ymd}
              ref={(el) => {
                cellRefs.current[index] = el;
              }}
              type="button"
              tabIndex={isFocused ? 0 : -1}
              aria-label={cellAriaLabel}
              onClick={() => onSelectDay(cell.ymd)}
              onKeyDown={(e) => handleCellKeyDown(e, index)}
              onFocus={() => setFocusedCellIndex(index)}
              className={`min-h-28 rounded-xl border border-border p-2 flex flex-col justify-between text-left transition cursor-pointer relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isPast ? "opacity-60 hover:opacity-100" : ""
              } ${
                releaseCount > 0
                  ? "bg-card/70 hover:bg-muted/70 hover:border-foreground/30 shadow-2xs"
                  : "bg-card/25 hover:bg-muted/40"
              }`}
            >
              {/* Top line: Day number + status dot + count */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5">
                  {isToday ? (
                    <span className="size-6 rounded-full bg-brand text-brand-foreground font-semibold flex items-center justify-center text-xs shadow-xs font-mono">
                      {cell.dayNumber}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-foreground/90 font-mono">
                      {cell.dayNumber}
                    </span>
                  )}

                  {hasMyItem && (
                    <span
                      className="size-2 rounded-full bg-status-queue shrink-0 shadow-2xs"
                      title="Contains title from your queue"
                    />
                  )}
                </div>

                {releaseCount > 0 && (
                  <span className="text-[10px] font-medium text-muted-foreground/80 font-mono tabular-nums">
                    {releaseCount}
                  </span>
                )}
              </div>

              {/* Bottom line: Mini posters stack or stealth text */}
              {releaseCount > 0 && (
                <div className="mt-2 w-full">
                  {hidePosters ? (
                    <div className="space-y-0.5">
                      <p className="text-[11px] font-medium text-foreground truncate font-sans">
                        {dayItems[0]?.title}
                      </p>
                      {releaseCount > 1 && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          +{releaseCount - 1} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <div className="flex items-center -space-x-3">
                        {dayItems.slice(0, 3).map((item, idx) => (
                          <div
                            key={`thumb-${item.externalId}`}
                            style={{ zIndex: 3 - idx }}
                            className="w-8 aspect-2/3 rounded overflow-hidden border border-background shadow-xs shrink-0 bg-muted relative"
                          >
                            <PosterImage
                              src={item.posterUrl}
                              title={item.title}
                              mediaType={item.mediaType}
                              sizes="32px"
                              compact
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                      {releaseCount > 3 && (
                        <span className="text-[10px] font-semibold text-muted-foreground ml-1.5 font-mono">
                          +{releaseCount - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </section>
    </div>
  );
}
