"use client";

import { Film, Gamepad2, Tv } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { usePosters } from "@/components/providers/poster-provider";

interface PosterImageProps {
  src: string | null | undefined;
  title: string;
  mediaType?: string;
  releaseYear?: number | null | string;
  sizes?: string;
  priority?: boolean;
  loading?: "lazy" | "eager";
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
  releaseYear,
  sizes,
  priority,
  loading,
  className,
  style,
  fallback = "title",
  compact = false,
  onError,
}: PosterImageProps) {
  const { hidePosters } = usePosters();
  const [prevSrc, setPrevSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  // Reset error state if src changes
  if (prevSrc !== src) {
    setPrevSrc(src);
    setHasError(false);
  }

  const showFallback = !src || hasError || hidePosters;

  if (showFallback) {
    if (fallback === "none") return null;

    if (compact) {
      const Icon = getMediaTypeIcon(mediaType);
      return (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-neutral-900 border border-white/8 select-none text-neutral-400">
          <Icon className="size-4" />
        </div>
      );
    }

    const Icon = getMediaTypeIcon(mediaType);

    return (
      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4 bg-linear-to-b from-[#22222b] via-[#16161e] to-[#0e0e13] border border-white/8 select-none">
        <div className="flex items-center justify-between text-neutral-400">
          <Icon className="size-4 opacity-75" />
          {releaseYear && <span className="text-[11px] font-mono opacity-60">{releaseYear}</span>}
        </div>
        <div className="my-auto py-2">
          <span className="font-semibold text-white text-[14px] leading-snug line-clamp-3 text-balance text-left block drop-shadow-sm">
            {title}
          </span>
        </div>
        <div className="w-8 h-1 rounded-full bg-brand/50" />
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
      loading={loading}
      className={className}
      style={style}
      onError={() => {
        setHasError(true);
        onError?.();
      }}
    />
  );
}
