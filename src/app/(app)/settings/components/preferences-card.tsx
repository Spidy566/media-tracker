"use client";

import { Bookmark, Eye, EyeOff, Play, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { usePosters } from "@/components/providers/poster-provider";
import { Button } from "@/components/ui/button";
import { HOME_HIDDEN_COOKIE, type HomeSection } from "@/lib/home-prefs";
import { cn } from "@/lib/utils";

interface PreferencesCardProps {
  initialHiddenSections: HomeSection[];
}

export function PreferencesCard({ initialHiddenSections }: PreferencesCardProps) {
  const router = useRouter();
  const { hidePosters, togglePosters } = usePosters();
  const [hiddenSections, setHiddenSections] = useState<HomeSection[]>(initialHiddenSections);

  const toggleSection = (id: HomeSection) => {
    const next = hiddenSections.includes(id)
      ? hiddenSections.filter((s) => s !== id)
      : [...hiddenSections, id];
    setHiddenSections(next);
    // biome-ignore lint/suspicious/noDocumentCookie: client-side cookie assignment for home hidden sections
    document.cookie = `${HOME_HIDDEN_COOKIE}=${next.join(",")}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  const homeSectionsList: {
    id: HomeSection;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "jump",
      label: "Jump back in",
      description: "Quick access to titles you are currently watching or playing.",
      icon: <Play className="w-4 h-4 fill-current stroke-0" />,
    },
    {
      id: "queue",
      label: "Up next in queue",
      description: "Your prioritized personal queue of upcoming titles.",
      icon: <Bookmark className="w-4 h-4" />,
    },
    {
      id: "trending",
      label: "Trending",
      description: "Weekly popular movies, TV series, and games across platforms.",
      icon: <TrendingUp className="w-4 h-4" />,
    },
  ];

  return (
    <div className="space-y-8">
      {/* 1. Appearance / Stealth Mode */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-foreground font-sans">Appearance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize how Tracklist displays media on this device.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground block font-sans">Stealth Mode</span>
              <span className="text-xs text-muted-foreground block">
                Hide cover posters and backdrops with typographic fallbacks for discreet browsing
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={togglePosters}
              className="h-8 px-3 rounded-xl text-xs font-semibold border-border cursor-pointer"
            >
              {hidePosters ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 mr-1.5 text-brand" /> Stealth Enabled
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Posters Visible
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Home Dashboard Sections */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground font-sans">Dashboard Sections</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose which sections appear on your Home dashboard.
          </p>
        </div>

        <div className="divide-y divide-border/60">
          {homeSectionsList.map((sec) => {
            const isVisible = !hiddenSections.includes(sec.id);
            return (
              <div key={sec.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="size-9 rounded-xl bg-muted flex items-center justify-center text-foreground shrink-0">
                    {sec.icon}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block font-sans">{sec.label}</span>
                    <span className="text-xs text-muted-foreground block truncate">
                      {sec.description}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isVisible}
                  aria-label={`Toggle ${sec.label}`}
                  onClick={() => toggleSection(sec.id)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isVisible ? "bg-brand" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-card shadow-xs ring-0 transition duration-200 ease-in-out",
                      isVisible
                        ? "translate-x-5 bg-brand-foreground"
                        : "translate-x-0 bg-muted-foreground",
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
