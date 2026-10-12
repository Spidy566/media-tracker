"use client";

import { usePosters } from "@/components/providers/poster-provider";

interface TrailerEmbedProps {
  trailerUrl: string;
  title: string;
}

export function TrailerEmbed({ trailerUrl, title }: TrailerEmbedProps) {
  const { hidePosters } = usePosters();

  if (hidePosters) {
    return (
      <a
        href={trailerUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:underline"
      >
        <span>Open trailer ↗</span>
      </a>
    );
  }

  return (
    <div className="aspect-video w-full max-w-2xl rounded-3xl overflow-hidden border border-border bg-black shadow-lg">
      <iframe
        src={trailerUrl}
        title={`${title} Trailer`}
        className="w-full h-full"
        allowFullScreen
      />
    </div>
  );
}
