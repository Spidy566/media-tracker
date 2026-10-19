"use client";

import { useState } from "react";

interface BiographyToggleProps {
  text: string;
}

export function BiographyToggle({ text }: BiographyToggleProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-1">
      <p
        className={`text-sm leading-relaxed text-muted-foreground max-w-2xl ${
          expanded ? "" : "line-clamp-5"
        }`}
      >
        {text}
      </p>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="text-xs font-semibold text-foreground/70 hover:text-foreground transition cursor-pointer"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
}
