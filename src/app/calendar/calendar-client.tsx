"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Bookmark,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Film,
  Gamepad2,
  Grid3X3,
  Layers,
  List,
  Play,
  RotateCcw,
  Sparkles,
  Tv,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Popover } from "radix-ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { CalendarApiResponse, CalendarItem } from "@/app/api/calendar/route";
import type { MediaStatus } from "@/components/media-card";
import { PosterImage } from "@/components/poster-image";
import { usePosters } from "@/components/providers/poster-provider";
import { ScrollRow } from "@/components/scroll-row";
import { logEntryApi } from "@/lib/api-entries";
import {
  buildMonthGrid,
  formatDayHeading,
  formatMonthTitle,
  getAdjacentMonths,
  parseYMD,
  relativeLabel,
  toYMD,
} from "@/lib/calendar-dates";
import { CalendarRow } from "./calendar-row";
import { DayPanel } from "./day-panel";

const REGION_OPTIONS = [
  { key: "all", label: "All languages" },
  { key: "en", label: "English" },
  { key: "ta", label: "Tamil" },
  { key: "te", label: "Telugu" },
  { key: "ml", label: "Malayalam" },
  { key: "hi", label: "Hindi" },
  { key: "ko", label: "Korean" },
  { key: "ja", label: "Japanese" },
] as const;

const WEEKDAYS_HEADER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
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

interface CalendarClientProps {
  currentUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string | null;
  } | null;
  myStatus: Record<string, MediaStatus>;
  squad: Record<string, { name: string; status: MediaStatus }[]>;
}

export function CalendarClient({ currentUser, myStatus, squad }: CalendarClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { hidePosters } = usePosters();

  // Compute Today's date on the client in user's local timezone
  const todayYmd = useMemo(() => toYMD(new Date()), []);
  const defaultMonth = useMemo(() => todayYmd.slice(0, 7), [todayYmd]);
  const currentYearNumber = useMemo(() => new Date().getFullYear(), []);
  const maxAllowedYear = currentYearNumber + 3;

  // URL state
  const rawMonth = searchParams.get("month");
  const month = useMemo(() => {
    if (!rawMonth || !/^\d{4}-\d{2}$/.test(rawMonth)) return defaultMonth;
    const [yStr, mStr] = rawMonth.split("-");
    const y = Number.parseInt(yStr, 10);
    const m = Number.parseInt(mStr, 10);
    if (m < 1 || m > 12 || y < 1990 || y > maxAllowedYear) {
      return defaultMonth;
    }
    return rawMonth;
  }, [rawMonth, defaultMonth, maxAllowedYear]);

  const rawType = searchParams.get("type");
  const type = (rawType === "movie" || rawType === "tv" || rawType === "game" ? rawType : "all") as
    | "all"
    | "movie"
    | "tv"
    | "game";

  const rawLang = searchParams.get("lang");
  const lang = rawLang || "all";

  // Top releases switch: default 1 (on) -> depth=top; 0 (off) -> depth=all
  const topParam = searchParams.get("top");
  const isTopOnly = topParam !== "0";
  const depth = isTopOnly ? "top" : "all";

  // View: "grid" (default) or "list"
  const viewParam = searchParams.get("view");
  const view = viewParam === "list" ? "list" : "grid";

  // My list switch: default 0 (off). Only applicable if logged in.
  const mineParam = searchParams.get("mine");
  const isMyListOnly = Boolean(currentUser && mineParam === "1");

  // Day panel modal state
  const [selectedDayYmd, setSelectedDayYmd] = useState<string | null>(null);

  // Jump popover state
  const [isJumpOpen, setIsJumpOpen] = useState(false);
  const [stepperYear, setStepperYear] = useState<number>(() => {
    const y = Number.parseInt(month.slice(0, 4), 10);
    return Number.isNaN(y) ? currentYearNumber : y;
  });

  // Sync stepper year when month changes
  useEffect(() => {
    const y = Number.parseInt(month.slice(0, 4), 10);
    if (!Number.isNaN(y)) {
      setStepperYear(y);
    }
  }, [month]);

  // URL state update helper
  const updateUrl = useCallback(
    (updates: {
      month?: string;
      type?: string;
      lang?: string;
      top?: number;
      view?: string;
      mine?: number;
    }) => {
      const nextMonth = updates.month !== undefined ? updates.month : month;
      const nextType = updates.type !== undefined ? updates.type : type;
      const nextLang = updates.lang !== undefined ? updates.lang : lang;
      const nextTop = updates.top !== undefined ? updates.top : isTopOnly ? 1 : 0;
      const nextView = updates.view !== undefined ? updates.view : view;
      const nextMine = updates.mine !== undefined ? updates.mine : isMyListOnly ? 1 : 0;

      const sp = new URLSearchParams();
      if (nextMonth !== defaultMonth) sp.set("month", nextMonth);
      if (nextType !== "all") sp.set("type", nextType);
      if (nextLang !== "all") sp.set("lang", nextLang);
      if (nextTop === 0) sp.set("top", "0");
      if (nextView === "list") sp.set("view", "list");
      if (nextMine === 1 && currentUser) sp.set("mine", "1");

      const queryStr = sp.toString();
      const path = queryStr ? `/calendar?${queryStr}` : "/calendar";
      router.replace(path, { scroll: false });
    },
    [month, type, lang, isTopOnly, view, isMyListOnly, defaultMonth, currentUser, router],
  );

  // Fetch releases
  const { data, isLoading, isError, isFetching, refetch } = useQuery<CalendarApiResponse>({
    queryKey: ["calendar-releases", month, type, lang, depth],
    queryFn: async () => {
      const res = await fetch(
        `/api/calendar?month=${month}&type=${type}&lang=${encodeURIComponent(lang)}&depth=${depth}`,
      );
      if (!res.ok) {
        throw new Error("Failed to load releases");
      }
      return res.json();
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Prefetch previous and next months
  const { prev: prevMonth, next: nextMonth } = useMemo(() => getAdjacentMonths(month), [month]);

  const prefetchMonth = useCallback(
    (targetMonth: string) => {
      queryClient.prefetchQuery({
        queryKey: ["calendar-releases", targetMonth, type, lang, depth],
        queryFn: async () => {
          const res = await fetch(
            `/api/calendar?month=${targetMonth}&type=${type}&lang=${encodeURIComponent(lang)}&depth=${depth}`,
          );
          if (!res.ok) throw new Error("Prefetch failed");
          return res.json();
        },
        staleTime: 1000 * 60 * 30,
      });
    },
    [queryClient, type, lang, depth],
  );

  // Prefetch when idle
  useEffect(() => {
    if (typeof window === "undefined") return;
    const runPrefetch = () => {
      prefetchMonth(prevMonth);
      prefetchMonth(nextMonth);
    };

    if ("requestIdleCallback" in window) {
      const id = (
        window as unknown as { requestIdleCallback: (cb: () => void) => number }
      ).requestIdleCallback(runPrefetch);
      return () => {
        (window as unknown as { cancelIdleCallback: (id: number) => void }).cancelIdleCallback(id);
      };
    }
    const timer = setTimeout(runPrefetch, 800);
    return () => clearTimeout(timer);
  }, [prevMonth, nextMonth, prefetchMonth]);

  // Quick status mutation
  const { mutate: setQuickStatus, isPending: isMutatingStatus } = useMutation({
    mutationFn: async ({
      media,
      status,
    }: {
      media: CalendarItem;
      status: "want_to" | "doing" | "done";
    }) => {
      return logEntryApi({
        media: {
          externalId: media.externalId,
          mediaType: media.mediaType,
          title: media.title,
          releaseYear: media.releaseYear,
          posterUrl: media.posterUrl,
          summary: media.summary,
          genres: media.genres,
        },
        status,
      });
    },
    onSuccess: (_, variables) => {
      router.refresh();
      const messages: Record<string, string> = {
        want_to: "Added to Queue",
        doing: "Marked as In Progress",
        done: "Logged as Completed",
      };
      toast.success(messages[variables.status] || "Status updated", {
        description: variables.media.title,
      });
    },
    onError: (err: Error) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to update status");
      }
    },
  });

  // Filter releases by "My list" if active
  const rawReleases = data?.releases || [];
  const filteredReleases = useMemo(() => {
    if (!isMyListOnly) return rawReleases;
    return rawReleases.filter(
      (item) => Boolean(myStatus[item.externalId]) || (squad[item.externalId]?.length ?? 0) > 0,
    );
  }, [rawReleases, isMyListOnly, myStatus, squad]);

  // Highlights: Top 8 by popularity from filtered month
  const highlights = useMemo(() => {
    const list = [...filteredReleases];
    list.sort((a, b) => b.popularity - a.popularity);
    return list.slice(0, 8);
  }, [filteredReleases]);

  // Month grid cells
  const monthGridCells = useMemo(() => buildMonthGrid(month), [month]);

  // Group items by day for Month Grid and Agenda List
  const dayGroups = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    const tbaList: CalendarItem[] = [];

    for (const item of filteredReleases) {
      if (item.datePrecision === "month" || !item.releaseDate) {
        tbaList.push(item);
      } else {
        if (!map[item.releaseDate]) {
          map[item.releaseDate] = [];
        }
        map[item.releaseDate].push(item);
      }
    }

    // Sort items within each day: items in my library or squad queues come FIRST, then by popularity
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => {
        const aHasMine = myStatus[a.externalId] || (squad[a.externalId]?.length ?? 0) > 0 ? 1 : 0;
        const bHasMine = myStatus[b.externalId] || (squad[b.externalId]?.length ?? 0) > 0 ? 1 : 0;
        if (bHasMine !== aHasMine) return bHasMine - aHasMine;
        return b.popularity - a.popularity;
      });
    }

    return { map, tbaList };
  }, [filteredReleases, myStatus, squad]);

  // Agenda days sorted chronologically
  const sortedAgendaDays = useMemo(() => {
    const days = Object.keys(dayGroups.map).sort();
    return days.map((day) => ({
      day,
      items: dayGroups.map[day],
    }));
  }, [dayGroups.map]);

  // Auto scroll to today on first load of current month in list view
  const agendaContainerRef = useRef<HTMLDivElement>(null);
  const scrolledOnceRef = useRef(false);

  useEffect(() => {
    if (scrolledOnceRef.current) return;
    if (month !== defaultMonth) return;
    if (sortedAgendaDays.length === 0) return;

    // Find today or next day with releases
    const target = sortedAgendaDays.find((d) => d.day >= todayYmd) || sortedAgendaDays[0];
    if (target) {
      const el = document.getElementById(`agenda-day-${target.day}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
        scrolledOnceRef.current = true;
      }
    }
  }, [month, defaultMonth, todayYmd, sortedAgendaDays]);

  // Roving tabindex for 42 grid cells
  const [focusedCellIndex, setFocusedCellIndex] = useState<number>(() => {
    const todayIndex = monthGridCells.findIndex((c) => c.inMonth && c.ymd === todayYmd);
    if (todayIndex !== -1) return todayIndex;
    const firstInMonth = monthGridCells.findIndex((c) => c.inMonth);
    return firstInMonth !== -1 ? firstInMonth : 0;
  });

  const cellRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const handleCellKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = index;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      nextIndex = Math.max(0, index - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nextIndex = Math.min(monthGridCells.length - 1, index + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      nextIndex = Math.max(0, index - 7);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      nextIndex = Math.min(monthGridCells.length - 1, index + 7);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const cell = monthGridCells[index];
      if (cell?.inMonth) {
        setSelectedDayYmd(cell.ymd);
      }
      return;
    } else {
      return;
    }

    setFocusedCellIndex(nextIndex);
    cellRefs.current[nextIndex]?.focus();
  };

  const isNonEnglish = lang !== "all" && lang !== "en";
  const isCurrentMonthShown = month === defaultMonth;
  const monthTitle = formatMonthTitle(month);

  const resetAllFilters = () => {
    updateUrl({ type: "all", lang: "all", top: 1, mine: 0 });
  };

  const isFiltered = type !== "all" || lang !== "all" || !isTopOnly || isMyListOnly;
  const isFutureMonth = month > defaultMonth;

  return (
    <div className="flex-1 w-full pb-16">
      {/* ─────────────────────────────────────────────────────────────
          1. CONTROLS BAR (Sticky top-16 z-20 bg-background/80 backdrop-blur)
          ───────────────────────────────────────────────────────────── */}
      <div className="sticky top-16 z-20 bg-background/85 backdrop-blur-md border-b border-border transition-colors">
        {/* Thin top loading bar for seamless month transitions */}
        {isFetching && (
          <div
            aria-hidden="true"
            className="absolute top-0 inset-x-0 h-0.5 bg-brand/20 overflow-hidden"
          >
            <div className="h-full bg-brand animate-hero-progress w-full" />
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-3">
          {/* Row 1: Month title, Prev/Next buttons, Today, Jump popover, Month/List toggle */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Left group */}
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground font-sans">
                {monthTitle}
              </h1>

              {/* Prev / Next round buttons (size-9 rounded-full border, shared style with ScrollRow) */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateUrl({ month: prevMonth })}
                  onMouseEnter={() => prefetchMonth(prevMonth)}
                  aria-label="Previous month"
                  className="size-9 rounded-full border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => updateUrl({ month: nextMonth })}
                  onMouseEnter={() => prefetchMonth(nextMonth)}
                  aria-label="Next month"
                  className="size-9 rounded-full border border-border bg-card hover:bg-muted text-foreground flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer shadow-2xs"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {/* Today outlined button (disabled if current month shown) */}
              <button
                type="button"
                onClick={() => updateUrl({ month: defaultMonth })}
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
                      <span className="font-semibold text-sm text-foreground">{stepperYear}</span>
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
                              updateUrl({ month: targetYm });
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

            {/* Right group (md and up only): Month / List toggle */}
            <div className="hidden md:flex items-center bg-card border border-border p-1 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => updateUrl({ view: "grid" })}
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
                onClick={() => updateUrl({ view: "list" })}
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

          {/* Row 2: Type segmented control, Language chips, Switches */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
            {/* Left: Type Segmented Control + Region scrollable row */}
            <div className="flex items-center gap-3 overflow-x-auto scrollbar-none pb-1">
              {/* Type segmented control */}
              <div className="flex items-center bg-card border border-border p-1 rounded-xl shrink-0 shadow-2xs">
                <button
                  type="button"
                  onClick={() => updateUrl({ type: "all" })}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    type === "all"
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Layers className="size-3.5" />
                  <span>All</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateUrl({ type: "movie" })}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    type === "movie"
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Film className="size-3.5" />
                  <span>Movies</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateUrl({ type: "tv" })}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    type === "tv"
                      ? "bg-muted text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Tv className="size-3.5" />
                  <span>TV</span>
                </button>
                {!isNonEnglish && (
                  <button
                    type="button"
                    onClick={() => updateUrl({ type: "game" })}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                      type === "game"
                        ? "bg-muted text-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Gamepad2 className="size-3.5" />
                    <span>Games</span>
                  </button>
                )}
              </div>

              {/* Languages scrollable chips (No emoji!) */}
              <div className="flex items-center gap-1.5 shrink-0">
                {REGION_OPTIONS.map((r) => {
                  const isSelected = lang === r.key;
                  return (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => {
                        // If selecting regional language and games is active, reset type to all
                        const nextType =
                          r.key !== "all" && r.key !== "en" && type === "game" ? "all" : type;
                        updateUrl({ lang: r.key, type: nextType });
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

              {/* Note when Games is hidden due to language */}
              {isNonEnglish && (
                <span className="text-[11px] text-muted-foreground/80 shrink-0 italic">
                  (Games only available in English)
                </span>
              )}
            </div>

            {/* Right: Switches (Top releases only, My list) */}
            <div className="flex items-center gap-3 shrink-0 self-end lg:self-center">
              {/* Switch 1: Top releases only */}
              <button
                type="button"
                role="switch"
                aria-checked={isTopOnly}
                onClick={() => updateUrl({ top: isTopOnly ? 0 : 1 })}
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

              {/* Switch 2: My list (Logged-in only) */}
              {currentUser && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={isMyListOnly}
                  onClick={() => updateUrl({ mine: isMyListOnly ? 0 : 1 })}
                  className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none group"
                >
                  <span className="text-muted-foreground group-hover:text-foreground transition">
                    My list
                  </span>
                  <span
                    className={`inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-border p-0.5 transition-colors ${
                      isMyListOnly ? "bg-brand text-brand-foreground" : "bg-muted"
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

      {/* Main content body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
        {/* Partial sources warning notification */}
        {data?.partial && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-status-doing shrink-0" />
              <span>
                Some sources didn&apos;t load:{" "}
                <span className="font-semibold text-foreground">
                  {data.failedSources.join(", ")}
                </span>
                .
              </span>
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs font-semibold text-foreground hover:underline cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* Informational note for TV series premieres */}
        {(type === "all" || type === "tv") && (
          <p className="text-[11px] text-muted-foreground">
            * TV calendar lists new series premieres, not new seasons of existing shows.
          </p>
        )}

        {/* ─────────────────────────────────────────────────────────────
            2. LOADING SKELETON
            ───────────────────────────────────────────────────────────── */}
        {isLoading && (
          <div className="space-y-8">
            {/* Skeleton highlights */}
            <div className="space-y-3">
              <div className="h-6 w-44 bg-muted rounded-lg animate-pulse" />
              <div className="flex gap-4 overflow-hidden">
                {Array.from({ length: 6 }, (_, i) => `highlight-skel-${i}`).map((skelKey) => (
                  <div key={skelKey} className="w-36 sm:w-44 shrink-0 space-y-2">
                    <div className="aspect-2/3 bg-muted rounded-2xl animate-pulse border border-border/40" />
                    <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  </div>
                ))}
              </div>
            </div>

            {/* Skeleton grid */}
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 42 }, (_, i) => `grid-skel-${i}`).map((skelKey) => (
                <div
                  key={skelKey}
                  className="min-h-28 rounded-lg bg-muted/40 border border-border/40 animate-pulse p-2"
                />
              ))}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            3. ERROR STATE
            ───────────────────────────────────────────────────────────── */}
        {isError && (
          <div className="text-center py-20 border border-border bg-card/60 rounded-3xl space-y-3 max-w-lg mx-auto p-6 shadow-xs">
            <AlertCircle className="size-8 text-destructive mx-auto" />
            <h3 className="text-base font-semibold text-foreground">Failed to load releases</h3>
            <p className="text-xs text-muted-foreground">
              Something went wrong while connecting to TMDB or IGDB. Check your connection or try
              again.
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-foreground text-background text-xs font-semibold hover:opacity-90 transition cursor-pointer shadow-xs"
            >
              <RotateCcw className="size-3.5" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            4. EMPTY STATE
            ───────────────────────────────────────────────────────────── */}
        {!isLoading && !isError && filteredReleases.length === 0 && (
          <div className="text-center py-20 border border-dashed border-border rounded-3xl space-y-3 max-w-lg mx-auto p-6">
            <CalendarIcon className="size-8 text-muted-foreground mx-auto" />
            <h3 className="text-base font-semibold text-foreground">
              {isFiltered
                ? "No releases match your current filters"
                : isFutureMonth
                  ? "Release dates for this month haven’t been announced yet."
                  : "No releases found for this month"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isFiltered
                ? "Try clearing filters to view all announced titles."
                : "Check back later as publishers and studios announce new release dates."}
            </p>
            {isFiltered && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border bg-card hover:bg-muted text-foreground text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            5. HIGHLIGHTS ("Biggest releases", top 8, min 4 items)
            ───────────────────────────────────────────────────────────── */}
        {!isLoading && !isError && highlights.length >= 4 && (
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
              const parts = item.externalId.split(":");
              const rawId = parts[parts.length - 1];
              const isFuture = item.releaseDate ? item.releaseDate > todayYmd : true;

              // Date badge string
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
                    {/* Link to detail page */}
                    <Link
                      href={`/media/${item.mediaType}/${rawId}`}
                      className="absolute inset-0 z-0 w-full h-full cursor-pointer focus:outline-none"
                      aria-label={`View details for ${item.title}`}
                    />

                    {/* Poster artwork (typographic in stealth mode) */}
                    <PosterImage
                      src={item.posterUrl}
                      title={item.title}
                      mediaType={item.mediaType}
                      sizes="(max-width: 640px) 144px, 176px"
                      className="object-cover transition duration-300 group-hover:scale-103 pointer-events-none"
                    />

                    {/* Top floating date badge & status dot */}
                    <div className="absolute top-2 inset-x-2 flex items-center justify-between gap-1 z-10 pointer-events-none">
                      {/* Date badge: clickable, opens Day panel */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (item.releaseDate) {
                            setSelectedDayYmd(item.releaseDate);
                          }
                        }}
                        className="pointer-events-auto bg-background/90 hover:bg-background text-foreground font-semibold text-[10px] px-2 py-0.5 rounded-full border border-border shadow-xs transition cursor-pointer"
                        title={item.releaseDate ? `View ${item.releaseDate}` : "Date TBA"}
                      >
                        {dateBadge}
                      </button>

                      {/* Status dot if in my library */}
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

                    {/* Quick status button */}
                    <div className="absolute bottom-2 inset-x-2 z-20 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150">
                      <div className="flex items-center gap-0.5 bg-background/95 backdrop-blur-md p-1 rounded-full border border-border shadow-lg">
                        <button
                          type="button"
                          title="Add to Queue"
                          disabled={isMutatingStatus}
                          onClick={(e) => {
                            e.stopPropagation();
                            setQuickStatus({ media: item, status: "want_to" });
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
                                setQuickStatus({ media: item, status: "doing" });
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
                                setQuickStatus({ media: item, status: "done" });
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

                  {/* Title and meta */}
                  <div className="flex flex-col min-w-0 mt-2">
                    <h4 className="text-xs font-semibold text-foreground truncate group-hover:opacity-85 transition">
                      {item.title}
                    </h4>
                    <p className="text-[11px] text-muted-foreground capitalize mt-0.5">
                      {item.mediaType === "tv" ? "TV series" : item.mediaType}
                    </p>
                  </div>
                </div>
              );
            })}
          </ScrollRow>
        )}

        {/* ─────────────────────────────────────────────────────────────
            6. MONTH GRID (md and up, view=grid)
            ───────────────────────────────────────────────────────────── */}
        {!isLoading && !isError && filteredReleases.length > 0 && view === "grid" && (
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
                  // Cell outside current month: empty, not interactive
                  return (
                    <div
                      key={cell.ymd}
                      aria-hidden="true"
                      className="min-h-28 rounded-xl border border-dashed border-border/30 bg-muted/10 pointer-events-none select-none opacity-40"
                    />
                  );
                }

                const dayItems = dayGroups.map[cell.ymd] || [];
                const releaseCount = dayItems.length;
                const isToday = cell.ymd === todayYmd;
                const isPast = cell.ymd < todayYmd;
                const hasMyItem = dayItems.some(
                  (item) =>
                    Boolean(myStatus[item.externalId]) || (squad[item.externalId]?.length ?? 0) > 0,
                );
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
                    onClick={() => setSelectedDayYmd(cell.ymd)}
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
                    {/* Top line of cell: Day number + status dot + count */}
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-1.5">
                        {isToday ? (
                          <span className="size-6 rounded-full bg-brand text-brand-foreground font-semibold flex items-center justify-center text-xs shadow-xs">
                            {cell.dayNumber}
                          </span>
                        ) : (
                          <span className="text-xs font-semibold text-foreground/90">
                            {cell.dayNumber}
                          </span>
                        )}

                        {/* Status dot on cell containing a title in my library */}
                        {hasMyItem && (
                          <span
                            className="size-2 rounded-full bg-status-queue shrink-0 shadow-2xs"
                            title="Contains item from your library"
                          />
                        )}
                      </div>

                      {releaseCount > 0 && (
                        <span className="text-[10px] font-medium text-muted-foreground/80">
                          {releaseCount}
                        </span>
                      )}
                    </div>

                    {/* Center / Bottom of cell: Mini posters stack or stealth text */}
                    {releaseCount > 0 && (
                      <div className="mt-2 w-full">
                        {hidePosters ? (
                          /* Stealth mode: replace posters with count and first title */
                          <div className="space-y-0.5">
                            <p className="text-[11px] font-medium text-foreground truncate">
                              {dayItems[0]?.title}
                            </p>
                            {releaseCount > 1 && (
                              <p className="text-[10px] text-muted-foreground">
                                +{releaseCount - 1} more
                              </p>
                            )}
                          </div>
                        ) : (
                          /* Normal mode: up to 3 stacked overlapping mini-posters */
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
                              <span className="text-[10px] font-semibold text-muted-foreground ml-1.5">
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
        )}

        {/* ─────────────────────────────────────────────────────────────
            7. AGENDA LIST (Below md ALWAYS, and when view=list)
            ───────────────────────────────────────────────────────────── */}
        {!isLoading && !isError && filteredReleases.length > 0 && (
          <div
            ref={agendaContainerRef}
            className={`${view === "grid" ? "block md:hidden" : "block"} space-y-8`}
          >
            {sortedAgendaDays.map(({ day, items }) => {
              const isPast = day < todayYmd;
              const headingLabel = formatDayHeading(day);
              const relText = relativeLabel(day, todayYmd);

              return (
                <section
                  key={`agenda-group-${day}`}
                  id={`agenda-day-${day}`}
                  className={`space-y-3 ${isPast ? "opacity-60" : ""}`}
                >
                  {/* Sticky day header just beneath controls bar */}
                  <div className="sticky top-32 z-10 bg-background/95 backdrop-blur border-b border-border py-2 px-1 flex items-center justify-between">
                    <h3 className="text-sm font-semibold tracking-tight text-foreground font-sans flex items-center gap-2">
                      {day === todayYmd && (
                        <span className="size-2 rounded-full bg-brand animate-pulse" />
                      )}
                      <span>{headingLabel}</span>
                    </h3>
                    {relText && (
                      <span className="text-xs font-medium text-muted-foreground">{relText}</span>
                    )}
                  </div>

                  {/* Day rows */}
                  <div className="space-y-2.5">
                    {items.map((item) => (
                      <CalendarRow
                        key={item.externalId}
                        item={item}
                        todayYmd={todayYmd}
                        myStatus={myStatus[item.externalId]}
                        squadMembers={squad[item.externalId]}
                        isMutating={isMutatingStatus}
                        onStatusChange={(status) => setQuickStatus({ media: item, status })}
                      />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Below the list: "Release date to be announced this month" group */}
            {dayGroups.tbaList.length > 0 && (
              <section className="space-y-3 pt-6 border-t border-border">
                <div className="flex items-center justify-between py-2 px-1 border-b border-border">
                  <h3 className="text-sm font-semibold tracking-tight text-foreground font-sans">
                    Release date to be announced this month
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {dayGroups.tbaList.length}{" "}
                    {dayGroups.tbaList.length === 1 ? "release" : "releases"}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {dayGroups.tbaList.map((item) => (
                    <CalendarRow
                      key={`tba-${item.externalId}`}
                      item={item}
                      todayYmd={todayYmd}
                      myStatus={myStatus[item.externalId]}
                      squadMembers={squad[item.externalId]}
                      isMutating={isMutatingStatus}
                      onStatusChange={(status) => setQuickStatus({ media: item, status })}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* ─────────────────────────────────────────────────────────────
          8. DAY PANEL (Radix Dialog: Floating card on desktop, Bottom sheet on mobile)
          ───────────────────────────────────────────────────────────── */}
      <DayPanel
        isOpen={Boolean(selectedDayYmd)}
        onClose={() => setSelectedDayYmd(null)}
        selectedYmd={selectedDayYmd}
        onSelectYmd={setSelectedDayYmd}
        monthYm={month}
        items={filteredReleases}
        todayYmd={todayYmd}
        myStatus={myStatus}
        squad={squad}
        onStatusChange={(item, status) => setQuickStatus({ media: item, status })}
      />
    </div>
  );
}
