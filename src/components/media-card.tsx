"use client";

import Image from "next/image";
import type { ReactNode } from "react";

interface MediaCardProps {
  title: string;
  mediaType: "movie" | "tv" | "game";
  posterUrl: string | null;
  releaseYear?: number | null;
  badge?: ReactNode;
  rating?: number | null;
  reviewNote?: string | null;
  action?: ReactNode;
  priority?: boolean;
  onClick?: () => void;
}

export function MediaCard({
  title,
  mediaType,
  posterUrl,
  releaseYear,
  badge,
  rating,
  reviewNote,
  action,
  priority = false,
  onClick,
}: MediaCardProps) {
  const innerContent = (
    <>
      {/* Poster Image */}
      {posterUrl ? (
        <Image
          src={posterUrl}
          alt={title}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 16vw"
          className="object-cover transition duration-300 group-hover:brightness-90"
          priority={priority}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-white/5">
          <span className="font-bold text-xs text-white/80 line-clamp-2">{title}</span>
          <span className="text-[10px] text-muted-foreground mt-1 uppercase">{mediaType}</span>
        </div>
      )}

      {/* Top Floating Badges */}
      <div className="relative z-10 p-2.5 flex items-start justify-between gap-1 pointer-events-none">
        {badge && <div className="pointer-events-auto">{badge}</div>}
        {rating && (
          <span className="ml-auto bg-black/85 backdrop-blur-md text-amber-400 font-black text-xs px-2 py-0.5 rounded-md border border-amber-500/30 flex items-center gap-1 shadow-sm">
            ★ {rating}
          </span>
        )}
      </div>

      {/* Bottom Info Gradient */}
      <div className="relative z-10 p-3 bg-linear-to-t from-black/95 via-black/70 to-transparent pt-8 pointer-events-none">
        <h3 className="font-bold text-xs text-white leading-snug line-clamp-1 group-hover:line-clamp-2 transition">
          {title}
        </h3>
        <div className="flex items-center gap-1.5 text-[10px] text-white/60 mt-0.5">
          <span>{releaseYear || "TBA"}</span>
          <span>•</span>
          <span className="uppercase">{mediaType}</span>
        </div>

        {reviewNote && (
          <p className="text-[10px] text-white/90 italic mt-1.5 line-clamp-1 border-l border-[#ff4b72] pl-1.5 bg-black/40 rounded-r py-0.5">
            &ldquo;{reviewNote}&rdquo;
          </p>
        )}

        {action && (
          <div className="pt-2 mt-1 border-t border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto">
            {action}
          </div>
        )}
      </div>
    </>
  );

  const baseClassName =
    "group relative aspect-2/3 rounded-xl overflow-hidden bg-[#141820] border border-white/10 hover:border-[#ff4b72]/60 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:z-10 flex flex-col justify-between text-left w-full";

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`${baseClassName} cursor-pointer`}>
        {innerContent}
      </button>
    );
  }

  return <div className={baseClassName}>{innerContent}</div>;
}
