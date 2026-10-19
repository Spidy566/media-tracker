"use client";

import { useState } from "react";
import { BANNER_HEIGHT, BannerVignette } from "@/components/backdrop-vignette";
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
      {/* 1. Backdrop Banner */}
      <div
        className={cn(
          "relative w-full overflow-hidden select-none",
          isCompact
            ? "h-24 sm:h-32 bg-muted"
            : cn("aspect-video sm:aspect-auto max-sm:h-auto bg-background", BANNER_HEIGHT),
        )}
      >
        {hasBackdrop && backdropUrl ? (
          <>
            {/* Full-width image wrapper at all breakpoints */}
            <div className="absolute inset-0 w-full">
              <PosterImage
                src={backdropUrl}
                title={title}
                priority
                sizes="100vw"
                className="object-cover"
                style={{
                  objectPosition: "center 25%",
                }}
                fallback="none"
                onError={() => setImageError(true)}
              />
            </div>

            {/* Corner vignette & bottom fade */}
            <BannerVignette />
          </>
        ) : !hidePosters && posterUrl ? (
          /* Gradient wash when there is no backdrop: blurred poster over bg-muted */
          <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
            <PosterImage
              src={posterUrl}
              title=""
              fallback="none"
              sizes="10vw"
              className="w-full h-full object-cover blur-3xl scale-150 opacity-10 dark:opacity-25"
            />
          </div>
        ) : null}

        {/* Back button container lining up with poster's left edge */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-8 h-full z-10 pointer-events-none">
          <div className="relative pointer-events-auto">
            <BackButton className="absolute top-5 left-0 z-10" />
          </div>
        </div>
      </div>

      {/* 2. Main Content */}
      <div
        className={cn(
          "max-w-6xl mx-auto px-4 sm:px-8 relative z-20 transition-all",
          isCompact ? "mt-4 sm:mt-6" : "mt-4 sm:-mt-10 lg:-mt-14",
        )}
      >
        {children}
      </div>
    </>
  );
}
