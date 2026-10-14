"use client";

import { Film, Gamepad2, Tv } from "lucide-react";
import Image from "next/image";
import { usePosters } from "@/components/providers/poster-provider";

interface PosterImageProps {
  src: string | null | undefined;
  title: string;
  mediaType?: string;
  releaseYear?: number | null | string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  style?: React.CSSProperties;
  /** "none" renders nothing when hidden (use for backdrops) */
  fallback?: "title" | "none";
  /** Renders a small centered icon without text for thumbnails under ~80px */
  compact?: boolean;
  onError?: () => void;
}

function getMediaTypeIcon(mediaType?: string) {
  switch (mediaType) {
    case "tv":
      return Tv;
    case "game":
      return Gamepad2;
    default:
      return Film;
  }
}

export function PosterImage({
  src,
  title,
  mediaType,
  releaseYear: _releaseYear,
  sizes,
  priority,
  className,
  style,
  fallback = "title",
  compact = false,
  onError,
}: PosterImageProps) {
  const { hidePosters } = usePosters();

  if (!src || hidePosters) {
    if (fallback === "none") return null;

    if (compact) {
      const Icon = getMediaTypeIcon(mediaType);
      return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-muted/60 border border-border/40 select-none text-muted-foreground/70">
          <Icon className="size-4" />
        </div>
      );
    }

    return (
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3.5 sm:p-4 bg-linear-to-b from-card via-card/95 to-muted/80 border border-border/40 select-none">
        <div className="my-auto py-1">
          <span className="font-semibold text-foreground text-sm leading-snug line-clamp-3 text-balance text-left block">
            {title}
          </span>
        </div>
        <div className="w-6 h-0.5 rounded-full bg-brand/40" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={title}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      style={style}
      onError={onError}
    />
  );
}
