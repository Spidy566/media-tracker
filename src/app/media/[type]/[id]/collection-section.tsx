"use client";

import Link from "next/link";
import { PosterImage } from "@/components/poster-image";
import type { MediaCollection } from "@/types/media-details";

interface CollectionSectionProps {
  collection?: MediaCollection | null;
  franchise?: string | null;
  mediaType: "movie" | "tv" | "game";
}

export function CollectionSection({ collection, franchise, mediaType }: CollectionSectionProps) {
  // If games have a franchise but no parts list
  if (mediaType === "game" && franchise) {
    return (
      <div className="space-y-2 bg-card border border-border rounded-2xl p-5 shadow-2xs">
        <h3 className="text-xs font-semibold text-foreground">Franchise</h3>
        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-background border border-border text-xs font-medium text-foreground">
          {franchise}
        </span>
      </div>
    );
  }

  // Movie collection
  if (!collection?.parts || collection.parts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-foreground">{collection.name}</h3>
        <span className="text-xs text-muted-foreground">{collection.parts.length} titles</span>
      </div>

      <div className="overflow-x-auto flex gap-4 scroll-smooth no-scrollbar pb-2">
        {collection.parts.map((part) => {
          const isCurrent = Boolean(part.isCurrent);

          return (
            <Link
              key={part.id}
              href={`/media/movie/${part.id}`}
              className={`flex flex-col w-32 shrink-0 group select-none rounded-2xl transition-all ${
                isCurrent
                  ? "ring-2 ring-brand ring-offset-2 ring-offset-background"
                  : "hover:opacity-90"
              }`}
            >
              <div
                className={`relative aspect-2/3 w-full rounded-2xl overflow-hidden bg-muted border ${
                  isCurrent
                    ? "border-brand shadow-md"
                    : "border-border group-hover:border-foreground/30 shadow-2xs"
                }`}
              >
                <PosterImage
                  src={part.posterUrl}
                  title={part.title}
                  mediaType="movie"
                  sizes="128px"
                  className="object-cover transition duration-300 group-hover:scale-103"
                />

                {isCurrent && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="px-2 py-0.5 rounded-full bg-brand text-brand-foreground text-[10px] font-bold shadow-xs">
                      Current
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-2 min-w-0">
                <span
                  className={`text-xs font-semibold line-clamp-1 block transition ${
                    isCurrent
                      ? "text-brand-text dark:text-brand"
                      : "text-foreground group-hover:opacity-80"
                  }`}
                >
                  {part.title}
                </span>
                <span className="text-[11px] text-muted-foreground block">
                  {part.releaseYear || "TBA"}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
