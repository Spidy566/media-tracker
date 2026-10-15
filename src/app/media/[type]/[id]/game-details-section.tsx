"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { useState } from "react";
import { usePosters } from "@/components/providers/poster-provider";
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
    timeToBeat &&
    (timeToBeat.hastily !== null || timeToBeat.normally !== null || timeToBeat.completely !== null);

  const hasPlatforms = platforms && platforms.length > 0;
  const hasModes = gameModes && gameModes.length > 0;
  const hasCompanies = developer || publisher;
  const hasScreenshots = screenshots && screenshots.length > 0;

  if (!hasTtb && !hasPlatforms && !hasModes && !hasCompanies && !hasScreenshots) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* 1. How Long to Beat */}
      {hasTtb && (
        <div className="space-y-2.5 bg-card border border-border rounded-2xl p-5 shadow-2xs">
          <h3 className="text-xs font-semibold text-foreground">How long to beat</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {timeToBeat.hastily !== null && (
              <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground block">Main story</span>
                <span className="text-base font-semibold text-foreground font-mono">
                  {timeToBeat.hastily}h
                </span>
              </div>
            )}
            {timeToBeat.normally !== null && (
              <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground block">Main + extras</span>
                <span className="text-base font-semibold text-foreground font-mono">
                  {timeToBeat.normally}h
                </span>
              </div>
            )}
            {timeToBeat.completely !== null && (
              <div className="p-3 rounded-xl bg-background border border-border space-y-1">
                <span className="text-[11px] text-muted-foreground block">Completionist</span>
                <span className="text-base font-semibold text-foreground font-mono">
                  {timeToBeat.completely}h
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. Platforms & Modes */}
      {(hasPlatforms || hasModes) && (
        <div className="space-y-4 bg-card border border-border rounded-2xl p-5 shadow-2xs">
          {hasPlatforms && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground block">Platforms</span>
              <div className="flex flex-wrap gap-1.5">
                {platforms.map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 rounded-full bg-background border border-border text-xs text-muted-foreground font-medium"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {hasModes && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground block">Game modes</span>
              <div className="flex flex-wrap gap-1.5">
                {gameModes.map((m) => (
                  <span
                    key={m}
                    className="px-2.5 py-1 rounded-full bg-background border border-border text-xs text-muted-foreground font-medium"
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
        <div className="space-y-2 bg-card border border-border rounded-2xl p-5 shadow-2xs">
          <h3 className="text-xs font-semibold text-foreground">Credits</h3>
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
      {hasScreenshots && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-foreground">Screenshots</h3>

          {hidePosters ? (
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
          ) : (
            <div className="overflow-x-auto flex gap-3 scroll-smooth no-scrollbar pb-2">
              {screenshots.map((s, idx) => (
                <button
                  type="button"
                  key={s.id || s.url}
                  onClick={() => setActiveScreenshot(s)}
                  className="relative aspect-video w-56 shrink-0 rounded-xl overflow-hidden bg-muted border border-border shadow-2xs hover:border-foreground/40 transition cursor-pointer group"
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
            </div>
          )}

          {/* Radix Dialog Lightbox */}
          <Dialog.Root
            open={Boolean(activeScreenshot)}
            onOpenChange={(open) => !open && setActiveScreenshot(null)}
          >
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />
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
