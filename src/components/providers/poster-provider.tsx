"use client";

import { createContext, useContext, useState } from "react";
import { HIDE_POSTERS_COOKIE } from "@/lib/poster-cookie";

interface PosterContextValue {
  hidePosters: boolean;
  togglePosters: () => void;
}

const PosterContext = createContext<PosterContextValue>({
  hidePosters: false,
  togglePosters: () => {},
});

export function PosterProvider({
  initialHidden,
  children,
}: {
  initialHidden: boolean;
  children: React.ReactNode;
}) {
  const [hidePosters, setHidePosters] = useState(initialHidden);

  const togglePosters = () => {
    const next = !hidePosters;
    // biome-ignore lint/suspicious/noDocumentCookie: client-side cookie assignment for poster visibility preference
    document.cookie = `${HIDE_POSTERS_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
    setHidePosters(next);
  };

  return (
    <PosterContext.Provider value={{ hidePosters, togglePosters }}>
      {children}
    </PosterContext.Provider>
  );
}

export function usePosters() {
  return useContext(PosterContext);
}
