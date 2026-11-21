"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { CalendarApiResponse, CalendarItem } from "@/app/api/calendar/route";
import { logEntryApi } from "@/lib/api-entries";
import {
  buildMonthGrid,
  formatMonthTitle,
  getAdjacentMonths,
  toYMD,
} from "@/lib/calendar-dates";
import { getStatusVerb } from "@/lib/media-formatters";
import type { MediaStatus } from "@/db/schema";
import { AgendaListView } from "./components/agenda-list-view";
import { CalendarHighlights } from "./components/calendar-highlights";
import { CalendarToolbar } from "./components/calendar-toolbar";
import { MonthGridView } from "./components/month-grid-view";
import { DayPanel } from "./day-panel";

interface CalendarUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface CalendarClientProps {
  currentUser: CalendarUser | null;
  myStatus: Record<string, MediaStatus>;
}

export function CalendarClient({ currentUser, myStatus: initialMyStatus }: CalendarClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const todayYmd = useMemo(() => toYMD(new Date()), []);
  const defaultMonth = useMemo(() => todayYmd.slice(0, 7), [todayYmd]);
  const currentYearNumber = useMemo(() => new Date().getFullYear(), []);
  const maxAllowedYear = currentYearNumber + 3;

  const rawMonth = searchParams.get("month");
  const month = useMemo(() => {
    if (!rawMonth || !/^\d{4}-\d{2}$/.test(rawMonth)) {
      return defaultMonth;
    }
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

  const topParam = searchParams.get("top");
  const isTopOnly = topParam !== "0";
  const depth = isTopOnly ? "top" : "all";

  const viewParam = searchParams.get("view");
  const view = viewParam === "list" ? "list" : "grid";

  const mineParam = searchParams.get("mine");
  const isMyListOnly = Boolean(currentUser && mineParam === "1");

  const [selectedDayYmd, setSelectedDayYmd] = useState<string | null>(null);
  const [myStatus, setMyStatus] = useState<Record<string, MediaStatus>>(initialMyStatus);

  const agendaContainerRef = useRef<HTMLDivElement | null>(null);

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

  const { data, isLoading, isError, refetch } = useQuery<CalendarApiResponse>({
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
    staleTime: 1000 * 60 * 30,
  });

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
          releaseYear: media.releaseDate ? Number.parseInt(media.releaseDate.slice(0, 4), 10) : null,
          posterUrl: media.posterUrl,
          creator: null,
          summary: media.summary || null,
          genres: [],
        },
        status,
      });
    },
    onSuccess: (_, variables) => {
      setMyStatus((prev) => ({
        ...prev,
        [variables.media.externalId]: variables.status,
      }));
      router.refresh();
      toast.success(getStatusVerb(variables.status), {
        description: variables.media.title,
      });
    },
    onError: (err: Error) => {
      if (err.message !== "Unauthorized") {
        toast.error("Failed to update status");
      }
    },
  });

  const monthTitle = useMemo(() => formatMonthTitle(month), [month]);
  const monthGridCells = useMemo(() => buildMonthGrid(month), [month]);

  const filteredReleases = useMemo(() => {
    if (!data?.releases) return [];
    if (!isMyListOnly) return data.releases;
    return data.releases.filter((item) => Boolean(myStatus[item.externalId]));
  }, [data?.releases, isMyListOnly, myStatus]);

  const dayGroups = useMemo(() => {
    const map: Record<string, CalendarItem[]> = {};
    for (const item of filteredReleases) {
      if (!item.releaseDate) continue;
      if (!map[item.releaseDate]) {
        map[item.releaseDate] = [];
      }
      map[item.releaseDate].push(item);
    }
    return map;
  }, [filteredReleases]);

  const sortedAgendaDays = useMemo(() => {
    const keys = Object.keys(dayGroups).sort();
    return keys.map((day) => ({
      day,
      items: dayGroups[day],
    }));
  }, [dayGroups]);

  const highlights = useMemo(() => {
    if (!filteredReleases || filteredReleases.length === 0) return [];
    return [...filteredReleases]
      .filter((r) => Boolean(r.posterUrl))
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 8);
  }, [filteredReleases]);

  return (
    <div className="w-full min-h-screen bg-background text-foreground flex flex-col pb-24">
      {/* 1. STICKY CONTROLS TOOLBAR */}
      <CalendarToolbar
        month={month}
        monthTitle={monthTitle}
        defaultMonth={defaultMonth}
        prevMonth={prevMonth}
        nextMonth={nextMonth}
        type={type}
        lang={lang}
        isTopOnly={isTopOnly}
        view={view}
        isMyListOnly={isMyListOnly}
        currentUser={currentUser}
        onUpdateUrl={updateUrl}
        onPrefetchMonth={prefetchMonth}
      />

      {/* 2. MAIN CONTENT BODY */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-8 w-full">
        {data?.partial && (
          <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-muted/40 border border-border text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <AlertCircle className="size-4 text-status-doing shrink-0" />
              <span>
                Some sources didn&apos;t load:{" "}
                <span className="font-semibold text-foreground font-mono">
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

        {(type === "all" || type === "tv") && (
          <p className="text-[11px] text-muted-foreground">
            * TV calendar lists new series premieres, not new seasons of existing shows.
          </p>
        )}

        {/* Highlights Row */}
        {!isLoading && !isError && highlights.length >= 4 && (
          <CalendarHighlights
            highlights={highlights}
            myStatus={myStatus}
            todayYmd={todayYmd}
            isMutatingStatus={isMutatingStatus}
            onSelectDay={(ymd) => setSelectedDayYmd(ymd)}
            onQuickStatus={(media, status) => setQuickStatus({ media, status })}
          />
        )}

        {/* Month Grid View */}
        {!isLoading && !isError && filteredReleases.length > 0 && view === "grid" && (
          <MonthGridView
            monthGridCells={monthGridCells}
            dayGroups={dayGroups}
            monthTitle={monthTitle}
            todayYmd={todayYmd}
            myStatus={myStatus}
            onSelectDay={(ymd) => setSelectedDayYmd(ymd)}
          />
        )}

        {/* Agenda List View */}
        {!isLoading && !isError && (
          <AgendaListView
            sortedAgendaDays={sortedAgendaDays}
            todayYmd={todayYmd}
            view={view}
            myStatus={myStatus}
            isMutatingStatus={isMutatingStatus}
            onQuickStatus={(media, status) => setQuickStatus({ media, status })}
            agendaContainerRef={agendaContainerRef}
          />
        )}
      </main>

      {/* Slide-over Day Panel */}
      <DayPanel
        isOpen={Boolean(selectedDayYmd)}
        onClose={() => setSelectedDayYmd(null)}
        selectedYmd={selectedDayYmd}
        onSelectYmd={(ymd) => setSelectedDayYmd(ymd)}
        monthYm={month}
        items={data?.releases || []}
        todayYmd={todayYmd}
        myStatus={myStatus}
        onStatusChange={(item, status) => setQuickStatus({ media: item, status })}
      />
    </div>
  );
}
