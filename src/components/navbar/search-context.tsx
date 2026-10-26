"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { SEARCH_MODAL_EVENT } from "@/lib/auth-events";

export type MediaFilterType = "all" | "movie" | "tv" | "game";

interface SearchContextType {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  openSearch: () => void;
  closeSearch: () => void;
  query: string;
  setQuery: (query: string) => void;
  mediaFilter: MediaFilterType;
  setMediaFilter: (filter: MediaFilterType) => void;
}

const SearchContext = createContext<SearchContextType>({
  isOpen: false,
  setIsOpen: () => {},
  openSearch: () => {},
  closeSearch: () => {},
  query: "",
  setQuery: () => {},
  mediaFilter: "all",
  setMediaFilter: () => {},
});

export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState<MediaFilterType>("all");

  const openSearch = useCallback(() => setIsOpen(true), []);

  const closeSearch = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setMediaFilter("all");
  }, []);

  const handleSetIsOpen = useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setQuery("");
      setMediaFilter("all");
    }
  }, []);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener(SEARCH_MODAL_EVENT, handleOpen);
    return () => window.removeEventListener(SEARCH_MODAL_EVENT, handleOpen);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => {
          const next = !prev;
          if (!next) {
            setQuery("");
            setMediaFilter("all");
          }
          return next;
        });
      } else if (e.key === "/" && !isOpen) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  return (
    <SearchContext.Provider
      value={{
        isOpen,
        setIsOpen: handleSetIsOpen,
        openSearch,
        closeSearch,
        query,
        setQuery,
        mediaFilter,
        setMediaFilter,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  return useContext(SearchContext);
}
