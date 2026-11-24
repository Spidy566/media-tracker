"use client";

import { Clock, X } from "lucide-react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { usePosters } from "@/components/providers/poster-provider";
import { ScrollRow } from "@/components/scroll-row";
import type { GameScreenshot, GameTimeToBeat } from "@/types/media-details";

interface GameDetailsSectionProps {
  timeToBeat?: GameTimeToBeat | null;
  platforms?: string[];
  gameModes?: string[];
  developer?: string | null;
  publisher?: string | null;
  screenshots?: GameScreenshot[];
}

export function GameDetailsSection({
  timeToBeat,
  platforms,
  gameModes,
  developer,
  publisher,
  screenshots,
}: GameDetailsSectionProps) {
  const { hidePosters } = usePosters();
  const [activeScreenshot, setActiveScreenshot] = useState<GameScreenshot | null>(null);

  const hasTtb =
    Boolean(timeToBeat) &&
    (timeToBeat?.hastily !== null ||
      timeToBeat?.normally !== null ||
      timeToBeat?.completely !== null);

  const hasPlatforms = Boolean(platforms && platforms.length > 0);
  const hasModes = Boolean(gameModes && gameModes.length > 0);
  const hasCompanies = Boolean(developer || publisher);
  const hasScreenshots = Boolean(screenshots && screenshots.length > 0);

  if (!hasTtb && !hasPlatforms && !hasModes && !hasCompanies && !hasScreenshots) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 1. How Long to Beat (Backloggd 3-Stat Row) */}
      {hasTtb && timeToBeat && (
        <div className="space-y-2.5 bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Clock className="size-3.5 text-status-queue" />
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
              How Long to Beat
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {timeToBeat.hastily !== null ? (
              <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-0.5 text-center">
                <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground block truncate">
                  Main Story
                </span>
                <span className="text-sm sm:text-base font-bold text-foreground font-mono tabular-nums">
                  {timeToBeat.hastily}h
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-0.5 text-center">
                <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground block truncate">
                  Main Story
                </span>
                <span className="text-xs text-muted-foreground/60 font-mono">—</span>
              </div>
            )}

            {timeToBeat.normally !== null ? (
              <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-0.5 text-center">
                <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground block truncate">
                  Main + Extra
                </span>
                <span className="text-sm sm:text-base font-bold text-foreground font-mono tabular-nums">
                  {timeToBeat.normally}h
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-0.5 text-center">
                <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground block truncate">
                  Main + Extra
                </span>
                <span className="text-xs text-muted-foreground/60 font-mono">—</span>
              </div>
            )}

            {timeToBeat.completely !== null ? (
              <div className="p-3 rounded-xl bg-muted/40 border border-border/80 space-y-0.5 text-center">
                <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground block truncate">
                  Completionist
                </span>
                <span className="text-sm sm:text-base font-bold text-foreground font-mono tabular-nums">
                  {timeToBeat.completely}h
                </span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-muted/20 border border-border/40 space-y-0.5 text-center">
                <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground block truncate">
                  Completionist
                </span>
                <span className="text-xs text-muted-foreground/60 font-mono">—</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Platforms & Game Modes */}
      {(hasPlatforms || hasModes) && (
        <div className="space-y-3 bg-card border border-border rounded-2xl p-4 shadow-sm">
          {hasPlatforms && platforms && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Platforms
              </span>
              <div className="flex flex-wrap gap-1.5">
                {platforms.map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 rounded-full bg-muted/50 border border-border text-xs text-muted-foreground font-medium select-none"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasModes && gameModes && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                Game Modes
              </span>
              <div className="flex flex-wrap gap-1.5">
                {gameModes.map((m) => (
                  <span
                    key={m}
                    className="px-2.5 py-1 rounded-full bg-muted/50 border border-border text-xs text-muted-foreground font-medium select-none"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Developer & Publisher */}
      {hasCompanies && (
        <div className="space-y-2 bg-card border border-border rounded-2xl p-4 shadow-sm">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Credits
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {developer && (
              <div>
                <span className="text-muted-foreground block text-[11px]">Developer</span>
                <span className="text-foreground font-medium mt-0.5 block">{developer}</span>
              </div>
            )}
            {publisher && (
              <div>
                <span className="text-muted-foreground block text-[11px]">Publisher</span>
                <span className="text-foreground font-medium mt-0.5 block">{publisher}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Screenshot Gallery & Lightbox */}
      {hasScreenshots && screenshots && (
        <div>
          {hidePosters ? (
            <div className="space-y-2.5">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Screenshots
              </h3>
              <div className="flex flex-wrap gap-2">
                {screenshots.map((s, idx) => (
                  <span
                    key={s.id || s.url}
                    className="px-3 py-1.5 rounded-lg bg-card border border-border text-xs text-muted-foreground font-medium"
                  >
                    Screenshot {idx + 1}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <ScrollRow
              title={
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Screenshots
                </h3>
              }
              contentClassName="gap-3"
            >
              {screenshots.map((s, idx) => (
                <button
                  type="button"
                  key={s.id || s.url}
                  onClick={() => setActiveScreenshot(s)}
                  className="relative aspect-video w-56 shrink-0 snap-start rounded-xl overflow-hidden bg-muted border border-border shadow-2xs hover:border-foreground/40 transition cursor-pointer group"
                >
                  <Image
                    src={s.thumbnailUrl}
                    alt={`Screenshot ${idx + 1}`}
                    fill
                    sizes="224px"
                    className="object-cover group-hover:scale-103 transition duration-200"
                  />
                </button>
              ))}
            </ScrollRow>
          )}

          {/* Radix Dialog Lightbox */}
          <Dialog.Root
            open={Boolean(activeScreenshot)}
            onOpenChange={(open) => !open && setActiveScreenshot(null)}
          >
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />
              <Dialog.Content
                onOpenAutoFocus={(e) => e.preventDefault()}
                className="fixed inset-4 sm:inset-10 z-50 flex items-center justify-center p-0 outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200"
              >
                <Dialog.Title className="sr-only">Screenshot View</Dialog.Title>
                <Dialog.Description className="sr-only">
                  High resolution game screenshot
                </Dialog.Description>

                <Dialog.Close asChild>
                  <button
                    type="button"
                    aria-label="Close screenshot"
                    className="absolute top-2 right-2 sm:top-4 sm:right-4 z-60 size-10 rounded-full bg-background/80 hover:bg-background border border-border shadow-lg flex items-center justify-center text-foreground cursor-pointer transition focus:outline-none"
                  >
                    <X className="size-5" />
                  </button>
                </Dialog.Close>

                {activeScreenshot && (
                  <div className="relative w-full h-full max-w-5xl max-h-[85vh] rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
                    <Image
                      src={activeScreenshot.url}
                      alt="Game screenshot"
                      fill
                      sizes="100vw"
                      className="object-contain"
                    />
                  </div>
                )}
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      )}
    </div>
  );
}
