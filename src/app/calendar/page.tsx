"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar as CalendarIcon, Film, Gamepad2, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import type { CalendarItem } from "@/app/api/calendar/route";
import { MediaCard, type MediaStatus } from "@/components/media-card";

const CALENDAR_SKELETON_KEYS = [
  "cal-skel-1",
  "cal-skel-2",
  "cal-skel-3",
  "cal-skel-4",
  "cal-skel-5",
  "cal-skel-6",
  "cal-skel-7",
  "cal-skel-8",
  "cal-skel-9",
  "cal-skel-10",
  "cal-skel-11",
  "cal-skel-12",
];

// Open, extensible industry list (Zero hardcoding in the backend!)
const REGIONS = [
  { key: "all", label: "All Global" },
  { key: "ta", label: "🎬 தமிழ் (Tamil)" },
  { key: "en", label: "🌐 Hollywood" },
  { key: "ja", label: "⛩️ Anime / Japanese" },
  { key: "ko", label: "🇰🇷 K-Drama / Korean" },
  { key: "hi", label: "🇮🇳 Bollywood / Hindi" },
] as const;

function formatReleaseDate(dateStr: string | null) {
  if (!dateStr) return "TBA";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day || 1);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getMonthGroup(dateStr: string | null) {
  if (!dateStr) return "Announced & In Production";
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day || 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export default function CalendarPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mediaFilter, setMediaFilter] = useState<"all" | "movie_tv" | "game">("all");
  const [langFilter, setLangFilter] = useState<string>("all");

  const { data, isLoading } = useQuery<{ releases: CalendarItem[] }>({
    queryKey: ["calendar-releases", mediaFilter, langFilter],
    queryFn: async () => {
      const res = await fetch(`/api/calendar?type=${mediaFilter}&lang=${langFilter}`);
      return res.json();
    },
    staleTime: 1000 * 60 * 30,
  });

  const { mutate: setQuickStatus } = useMutation({
    mutationFn: async ({ media, status }: { media: CalendarItem; status: MediaStatus }) => {
      const res = await fetch("/api/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media,
          status,
        }),
      });
      if (!res.ok) throw new Error("Failed to track");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      toast.success("Added to Queue", {
        description: variables.media.title,
      });
    },
  });

  const releases = data?.releases || [];

  // Group items chronologically by Month
  const groupedReleases: Record<string, CalendarItem[]> = {};
  for (const item of releases) {
    const groupKey = getMonthGroup(item.releaseDate);
    if (!groupedReleases[groupKey]) {
      groupedReleases[groupKey] = [];
    }
    groupedReleases[groupKey].push(item);
  }

  const navigateToMedia = (media: CalendarItem) => {
    const parts = media.externalId.split(":");
    const rawId = parts[parts.length - 1];
    router.push(`/media/${media.mediaType}/${rawId}`);
  };

  const isLanguageFiltered = langFilter !== "all" && langFilter !== "en";

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <CalendarIcon className="w-5 h-5 text-emerald-400" />
            <span>Release Calendar</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Global schedule & regional cinema. 1-click 🔖 to save to your queue.
          </p>
        </div>

        {/* Media Type Switcher (Only visible when not filtering strictly by a regional language) */}
        {!isLanguageFiltered && (
          <div className="flex items-center bg-zinc-900 border border-zinc-800 p-1 rounded-lg shrink-0">
            <button
              type="button"
              onClick={() => setMediaFilter("all")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                mediaFilter === "all"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All</span>
            </button>
            <button
              type="button"
              onClick={() => setMediaFilter("movie_tv")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                mediaFilter === "movie_tv"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Movies & TV</span>
            </button>
            <button
              type="button"
              onClick={() => setMediaFilter("game")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                mediaFilter === "game"
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Games</span>
            </button>
          </div>
        )}
      </div>

      {/* Dynamic Region / Language Filter Pills (Scrollable on mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {REGIONS.map((r) => {
          const isSelected = langFilter === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setLangFilter(r.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer shrink-0 ${
                isSelected
                  ? "bg-zinc-100 text-zinc-950 font-semibold shadow-xs"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="space-y-8">
          <div className="h-5 w-36 bg-zinc-900 rounded animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {CALENDAR_SKELETON_KEYS.map((key) => (
              <div
                key={key}
                className="aspect-2/3 bg-zinc-900 rounded-lg animate-pulse border border-zinc-800/60"
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && releases.length === 0 && (
        <div className="text-center py-24 border border-dashed border-zinc-800 rounded-xl">
          <p className="text-sm font-semibold text-zinc-300">No upcoming releases found</p>
          <p className="text-xs text-zinc-500 mt-1">
            Try switching regions or choosing &quot;All Global&quot;.
          </p>
        </div>
      )}

      {/* Grouped Month Sections */}
      {!isLoading && (
        <div className="space-y-10">
          {Object.entries(groupedReleases).map(([monthLabel, items]) => (
            <section key={monthLabel} className="space-y-3">
              <div className="flex items-center gap-2 border-b border-zinc-800/60 pb-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <h2 className="text-sm font-bold text-zinc-200 uppercase tracking-wider">
                  {monthLabel}
                </h2>
                <span className="text-[11px] text-zinc-500 font-mono">
                  ({items.length} {items.length === 1 ? "release" : "releases"})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {items.map((item) => (
                  <div key={item.externalId} className="max-w-50">
                    <MediaCard
                      title={item.title}
                      mediaType={item.mediaType}
                      posterUrl={item.posterUrl}
                      releaseYear={item.releaseYear}
                      subtitle={formatReleaseDate(item.releaseDate)}
                      onQuickStatus={(status) => setQuickStatus({ media: item, status })}
                      onClick={() => navigateToMedia(item)}
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
