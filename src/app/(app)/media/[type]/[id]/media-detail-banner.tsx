"use client";

import { useState } from "react";
import { BannerVignette } from "@/components/backdrop-vignette";
import { PosterImage } from "@/components/poster-image";
import { usePosters } from "@/components/providers/poster-provider";
import { cn } from "@/lib/utils";
import { BackButton } from "./back-button";

interface MediaDetailBannerProps {
  backdropUrl: string | null;
  posterUrl: string | null;
  title: string;
  children: React.ReactNode;
}

export function MediaDetailBanner({
  backdropUrl,
  posterUrl,
  title,
  children,
}: MediaDetailBannerProps) {
  const { hidePosters } = usePosters();
  const [imageError, setImageError] = useState(false);

  const hasBackdrop = Boolean(backdropUrl) && !imageError && !hidePosters;
  const isCompact = !hasBackdrop;

  return (
    <>
      {/* 1. Cinematic Backdrop Banner (Letterboxd / Backloggd Style) */}
      <div
        className={cn(
          "relative w-full overflow-hidden select-none",
          isCompact
            ? "h-20 sm:h-28 bg-card/50 border-b border-border/40"
            : "h-[18rem] sm:h-[24rem] lg:h-[28rem] bg-background",
        )}
      >
        {hasBackdrop && backdropUrl ? (
          <>
            {/* Top dark gradient to ensure Back button contrast */}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-background/80 via-background/30 to-transparent pointer-events-none z-10"
            />

            {/* Full-width backdrop image */}
            <div className="absolute inset-0 w-full">
              <PosterImage
                src={backdropUrl}
                title={title}
                priority
                sizes="100vw"
                className="object-cover"
                style={{
                  objectPosition: "center 20%",
                }}
                fallback="none"
                onError={() => setImageError(true)}
              />
            </div>

            {/* Corner vignette & seamless bottom fade to #0B0B0E */}
            <BannerVignette />
          </>
        ) : !hidePosters && posterUrl ? (
          /* Soft ambient blur wash when backdrop is unavailable */
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
            <PosterImage
              src={posterUrl}
              title=""
              fallback="none"
              sizes="10vw"
              className="w-full h-full object-cover blur-3xl scale-150 opacity-20"
            />
            <div className="absolute inset-0 bg-background/60" />
          </div>
        ) : null}

        {/* Back button container floating over top-left */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-full z-20 pointer-events-none">
          <div className="relative pointer-events-auto pt-4 sm:pt-6">
            <BackButton />
          </div>
        </div>
      </div>

      {/* 2. Main Content Container (Pulls up over the backdrop) */}
      <div
        className={cn(
          "max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 transition-all",
          isCompact ? "mt-4 sm:mt-6" : "-mt-24 sm:-mt-36 lg:-mt-44",
        )}
      >
        {children}
      </div>
    </>
  );
}
