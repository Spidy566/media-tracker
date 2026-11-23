"use client";

import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Film,
  Gamepad2,
  Grid3X3,
  Layers,
  List,
  Tv,
} from "lucide-react";
import { Popover } from "radix-ui";
import { useState } from "react";

export const REGION_OPTIONS = [
  { key: "all", label: "All languages" },
  { key: "en", label: "English" },
  { key: "ta", label: "Tamil" },
  { key: "te", label: "Telugu" },
  { key: "ml", label: "Malayalam" },
  { key: "hi", label: "Hindi" },
  { key: "ja", label: "Japanese" },
  { key: "ko", label: "Korean" },
  { key: "fr", label: "French" },
  { key: "es", label: "Spanish" },
  { key: "de", label: "German" },
];

export const MONTHS_SHORT = [
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

interface CalendarToolbarProps {
  month: string;
  monthTitle: string;
  defaultMonth: string;
  prevMonth: string;
  nextMonth: string;
  type: "all" | "movie" | "tv" | "game";
  lang: string;
  isTopOnly: boolean;
  view: "grid" | "list";
  isMyListOnly: boolean;
  currentUser: { id: string } | null;
  onUpdateUrl: (updates: {
    month?: string;
    type?: string;
    lang?: string;
    top?: number;
    view?: string;
    mine?: number;
  }) => void;
  onPrefetchMonth: (targetMonth: string) => void;
}

export function CalendarToolbar({
  month,
  monthTitle,
  defaultMonth,
  prevMonth,
  nextMonth,
  type,
  lang,
  isTopOnly,
  view,
  isMyListOnly,
  currentUser,
  onUpdateUrl,
  onPrefetchMonth,
}: CalendarToolbarProps) {
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const currentYearNumber = new Date().getFullYear();
  const maxAllowedYear = currentYearNumber + 3;

  const [stepperYear, setStepperYear] = useState<number>(() => {
    const y = Number.parseInt(month.slice(0, 4), 10);
    return Number.isNaN(y) ? currentYearNumber : y;
  });

  const isCurrentMonthShown = month === defaultMonth;
  const isNonEnglish = lang !== "all" && lang !== "en";

  return (
    <div className="sticky top-16 z-20 bg-background/90 backdrop-blur-md border-b border-border transition-colors">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 py-3 space-y-3">
        {/* Row 1: Month navigation + View switch */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Previous / Month title / Next + Today + Jump */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              aria-label="Previous month"
              onClick={() => onUpdateUrl({ month: prevMonth })}
              onMouseEnter={() => onPrefetchMonth(prevMonth)}
              className="size-9 rounded-xl border border-border bg-card/60 hover:bg-card text-foreground flex items-center justify-center transition cursor-pointer shadow-2xs hover:border-foreground/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronLeft className="size-4" />
            </button>

            <h1 className="text-base sm:text-lg font-semibold tracking-tight text-foreground min-w-32 sm:min-w-40 text-center font-sans select-none">
              {monthTitle}
            </h1>

            <button
              type="button"
              aria-label="Next month"
              onClick={() => onUpdateUrl({ month: nextMonth })}
              onMouseEnter={() => onPrefetchMonth(nextMonth)}
              className="size-9 rounded-xl border border-border bg-card/60 hover:bg-card text-foreground flex items-center justify-center transition cursor-pointer shadow-2xs hover:border-foreground/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight className="size-4" />
            </button>

            {/* Today jump button */}
            <button
              type="button"
              onClick={() => onUpdateUrl({ month: defaultMonth })}
              disabled={isCurrentMonthShown}
              className="h-9 px-3 rounded-xl border border-border bg-card/60 hover:bg-card text-foreground text-xs font-semibold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Today
            </button>

            {/* Jump button with Radix Popover */}
            <Popover.Root open={isJumpOpen} onOpenChange={setIsJumpOpen}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  aria-label="Jump to month and year"
                  className="h-9 px-3 rounded-xl border border-border bg-card/60 hover:bg-card text-foreground text-xs font-semibold transition cursor-pointer shadow-2xs flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <CalendarIcon className="size-3.5 text-muted-foreground" />
                  <span>Jump</span>
                </button>
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Content
                  align="start"
                  sideOffset={8}
                  className="z-50 w-72 rounded-2xl border border-border bg-popover p-4 shadow-xl outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200"
                >
                  {/* Year stepper */}
                  <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
                    <button
                      type="button"
                      onClick={() => setStepperYear((y) => Math.max(2000, y - 1))}
                      disabled={stepperYear <= 2000}
                      aria-label="Previous year"
                      className="size-8 rounded-lg border border-border hover:bg-muted text-foreground flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <span className="font-semibold text-sm text-foreground font-mono tabular-nums">
                      {stepperYear}
                    </span>
                    <button
                      type="button"
                      onClick={() => setStepperYear((y) => Math.min(maxAllowedYear, y + 1))}
                      disabled={stepperYear >= maxAllowedYear}
                      aria-label="Next year"
                      className="size-8 rounded-lg border border-border hover:bg-muted text-foreground flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>

                  {/* 12 Month buttons */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {MONTHS_SHORT.map((mName, idx) => {
                      const mNum = String(idx + 1).padStart(2, "0");
                      const targetYm = `${stepperYear}-${mNum}`;
                      const isSelected = targetYm === month;

                      return (
                        <button
                          key={mName}
                          type="button"
                          onClick={() => {
                            onUpdateUrl({ month: targetYm });
                            setIsJumpOpen(false);
                          }}
                          className={`py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                            isSelected
                              ? "bg-foreground text-background font-semibold shadow-xs"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {mName}
                        </button>
                      );
                    })}
                  </div>
                </Popover.Content>
              </Popover.Portal>
            </Popover.Root>
          </div>

          {/* Right group: Month / List toggle */}
          <div className="hidden md:flex items-center bg-card border border-border p-1 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => onUpdateUrl({ view: "grid" })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                view === "grid"
                  ? "bg-muted text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Grid3X3 className="size-3.5" />
              <span>Month</span>
            </button>
            <button
              type="button"
              onClick={() => onUpdateUrl({ view: "list" })}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                view === "list"
                  ? "bg-muted text-foreground shadow-2xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List className="size-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>

        {/* Row 2: Media Type segmented control + Languages + Switches */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1 border-t border-border/60">
          {/* Left: Media Types & Language Pills */}
          <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto scrollbar-none pb-1">
            {/* Media type segmented control */}
            <div className="flex items-center bg-card border border-border p-1 rounded-xl shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => onUpdateUrl({ type: "all" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  type === "all"
                    ? "bg-muted text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="size-3.5" />
                <span>All</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateUrl({ type: "movie" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  type === "movie"
                    ? "bg-muted text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Film className="size-3.5" />
                <span>Movies</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateUrl({ type: "tv" })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  type === "tv"
                    ? "bg-muted text-foreground font-semibold shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Tv className="size-3.5" />
                <span>TV</span>
              </button>
              {!isNonEnglish && (
                <button
                  type="button"
                  onClick={() => onUpdateUrl({ type: "game" })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    type === "game"
                      ? "bg-muted text-foreground font-semibold shadow-2xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Gamepad2 className="size-3.5" />
                  <span>Games</span>
                </button>
              )}
            </div>

            {/* Region / Language pills */}
            <div className="flex items-center gap-1 shrink-0">
              {REGION_OPTIONS.map((r) => {
                const isSelected = lang === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => {
                      const nextUpdates: { lang: string; type?: string } = { lang: r.key };
                      if (r.key !== "all" && r.key !== "en" && type === "game") {
                        nextUpdates.type = "all";
                      }
                      onUpdateUrl(nextUpdates);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer shrink-0 border ${
                      isSelected
                        ? "bg-foreground text-background border-foreground font-semibold shadow-2xs"
                        : "bg-card/70 text-muted-foreground hover:text-foreground border-border hover:bg-card"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {isNonEnglish && (
              <span className="text-[11px] text-muted-foreground/80 shrink-0 italic">
                (Games only available in English)
              </span>
            )}
          </div>

          {/* Right: Switches (Top releases, My list) */}
          <div className="flex items-center gap-4 shrink-0 self-end lg:self-center">
            {/* Switch 1: Top releases only */}
            <button
              type="button"
              role="switch"
              aria-checked={isTopOnly}
              onClick={() => onUpdateUrl({ top: isTopOnly ? 0 : 1 })}
              className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none group"
            >
              <span className="text-muted-foreground group-hover:text-foreground transition">
                Top releases only
              </span>
              <span
                className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border p-0.5 transition-colors ${
                  isTopOnly ? "bg-foreground" : "bg-muted"
                }`}
              >
                <span
                  className={`size-3.5 rounded-full bg-background transition-transform shadow-xs ${
                    isTopOnly ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </span>
            </button>

            {/* Switch 2: My list */}
            {currentUser && (
              <button
                type="button"
                role="switch"
                aria-checked={isMyListOnly}
                onClick={() => onUpdateUrl({ mine: isMyListOnly ? 0 : 1 })}
                className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none group"
              >
                <span className="text-muted-foreground group-hover:text-foreground transition">
                  In My Queue
                </span>
                <span
                  className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border p-0.5 transition-colors ${
                    isMyListOnly ? "bg-status-queue text-background" : "bg-muted"
                  }`}
                >
                  <span
                    className={`size-3.5 rounded-full bg-background transition-transform shadow-xs ${
                      isMyListOnly ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
