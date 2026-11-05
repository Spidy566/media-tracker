"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSearch } from "@/components/navbar/search-context";
import { SearchDropdownContent } from "@/components/search-modal";
import { cn } from "@/lib/utils";

const SEARCH_SUGGESTIONS = [
  "Try 'Elden Ring'",
  "Try 'Dune'",
  "Try 'Breaking Bad'",
  "Try 'Severance'",
  "Try 'Cyberpunk 2077'",
  "Try 'Succession'",
  "Try 'Spirited Away'",
  "Try 'The Last of Us'",
  "Try 'Arcane'",
  "Try 'Interstellar'",
  "Try 'Hades II'",
  "Try 'Shōgun'",
];

export function SearchTrigger() {
  const { isOpen, openSearch, closeSearch, query, setQuery } = useSearch();
  const [defaultPlaceholder, setDefaultPlaceholder] = useState("Try 'Elden Ring'");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * SEARCH_SUGGESTIONS.length);
    setDefaultPlaceholder(SEARCH_SUGGESTIONS[randomIndex]);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        closeSearch();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeSearch();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, closeSearch]);

  if (isOpen) {
    return (
      <div ref={containerRef} className="relative w-full max-w-110">
        {/* Active Search Input Pill */}
        <div
          className={cn(
            "w-full h-12 px-4 rounded-full border flex items-center justify-between transition-all duration-200",
            "bg-popover border-border shadow-xl ring-1 ring-border text-foreground",
          )}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Search className="size-4.5 text-brand shrink-0" strokeWidth={2} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, TV shows, games..."
              className="w-full bg-transparent text-[14px] sm:text-[15px] text-foreground placeholder:text-muted-foreground outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear query"
                className="p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close search"
              className="inline-flex items-center text-[11px] font-mono font-medium text-muted-foreground bg-muted hover:bg-muted/80 px-2 py-0.5 rounded border border-border transition-colors cursor-pointer select-none"
            >
              Esc
            </button>
          </div>
        </div>

        {/* Anchored Dropdown Popover */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 w-145 max-w-[calc(100vw-2rem)] origin-top z-50 bg-popover/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
          <SearchDropdownContent />
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openSearch}
      aria-label="Search media catalog or press Command K"
      className="group w-full max-w-110 h-12 px-5 rounded-full border border-border flex items-center justify-between text-muted-foreground hover:text-foreground transition-all duration-300 ease-out cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 select-none bg-card hover:bg-muted/70 shadow-xs"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Search
          className="size-4.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
          strokeWidth={1.75}
        />
        <span className="text-[14px] sm:text-[15px] font-normal text-muted-foreground group-hover:text-foreground transition-colors truncate">
          {defaultPlaceholder}
        </span>
      </div>
      <kbd className="inline-flex items-center text-[12px] font-mono font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border select-none shrink-0 ml-3">
        ⌘K
      </kbd>
    </button>
  );
}
