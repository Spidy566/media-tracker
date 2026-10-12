"use client";

import Image from "next/image";
import { usePosters } from "@/components/providers/poster-provider";

interface PosterImageProps {
  src: string | null | undefined;
  title: string;
  mediaType?: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** "none" renders nothing when hidden (use for backdrops) */
  fallback?: "title" | "none";
}

export function PosterImage({
  src,
  title,
  mediaType,
  sizes,
  priority,
  className,
  fallback = "title",
}: PosterImageProps) {
  const { hidePosters } = usePosters();

  if (!src || hidePosters) {
    if (fallback === "none") return null;
    return (
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-muted p-3 text-center">
        <span className="line-clamp-3 text-xs font-semibold text-foreground">{title}</span>
        {mediaType && (
          <span className="font-mono text-[10px] uppercase text-muted-foreground">{mediaType}</span>
        )}
      </div>
    );
  }

  return (
    <Image src={src} alt={title} fill sizes={sizes} priority={priority} className={className} />
  );
}
