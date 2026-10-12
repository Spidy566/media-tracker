"use client";

import { ImageIcon, ImageOff } from "lucide-react";
import { usePosters } from "@/components/providers/poster-provider";

export function PosterToggle() {
  const { hidePosters, togglePosters } = usePosters();
  const label = hidePosters ? "Show posters" : "Hide posters";

  return (
    <button
      type="button"
      onClick={togglePosters}
      aria-pressed={hidePosters}
      aria-label={label}
      title={label}
      className="w-8 h-8 rounded-full flex items-center justify-center border border-border bg-card hover:bg-muted text-foreground transition cursor-pointer shadow-xs"
    >
      {hidePosters ? <ImageOff className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
    </button>
  );
}
