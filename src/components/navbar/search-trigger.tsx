"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDiscover } from "@/components/discover/discover-context";
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

interface SearchTriggerProps {
  isIsland?: boolean;
}

export function SearchTrigger({ isIsland = false }: SearchTriggerProps) {
  const { searchPlaceholder } = useDiscover();
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

  const displayPlaceholder = searchPlaceholder || defaultPlaceholder;

  if (isOpen) {
    return (
      <div ref={containerRef} className="relative w-full max-w-110">
        {/* Active Search Input Pill */}
        <div
          className={cn(
            "w-full h-12 px-4 rounded-full border flex items-center justify-between transition-all duration-200",
            "bg-[#1c1c24] border-white/20 shadow-xl shadow-black/40 ring-2 ring-white/10 text-white",
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
              className="w-full bg-transparent text-[14px] sm:text-[15px] text-white placeholder:text-neutral-400 outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-2">
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear query"
                className="p-1 rounded-full text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            )}
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close search"
              className="inline-flex items-center text-[11px] font-mono font-medium text-neutral-300 bg-white/6 hover:bg-white/12 px-2 py-0.5 rounded border border-white/10 transition-colors cursor-pointer select-none"
            >
              Esc
            </button>
          </div>
        </div>

        {/* Anchored Dropdown Popover */}
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2.5 w-[580px] max-w-[calc(100vw-2rem)] origin-top z-50 bg-[#1c1c24]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
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
      className={cn(
        "group w-full max-w-110 h-12 px-5 rounded-full border border-white/8 flex items-center justify-between text-neutral-300 hover:text-white transition-all duration-300 ease-out cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-0 select-none",
        isIsland
          ? "bg-[#1a1a1a]/85 backdrop-blur-xl shadow-lg shadow-black/40 hover:border-white/20"
          : "bg-[#222228] hover:bg-[#282832] hover:border-white/20 shadow-none",
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Search
          className="size-4.5 text-neutral-400 group-hover:text-white transition-colors shrink-0"
          strokeWidth={1.75}
        />
        <span className="text-[14px] sm:text-[15px] font-normal text-neutral-300 group-hover:text-white transition-colors truncate">
          {displayPlaceholder}
        </span>
      </div>
      <kbd className="inline-flex items-center text-[12px] font-mono font-medium text-neutral-300 bg-white/6 px-2 py-0.5 rounded border border-white/8 select-none shrink-0 ml-3">
        ⌘K
      </kbd>
    </button>
  );
}
