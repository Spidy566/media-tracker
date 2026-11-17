"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { useSearch } from "@/components/navbar/search-context";
import { SearchDropdownContent } from "@/components/search-modal";

export function SearchManager() {
  const { isOpen, closeSearch, query, setQuery } = useSearch();
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        mobileInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Soft transparent backdrop (blurring page content underneath header) */}
      <div
        className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm animate-in fade-in-0 duration-200"
        onClick={closeSearch}
        aria-hidden="true"
      />

      {/* Mobile-only header-anchored dropdown (< 768px) */}
      <div className="fixed top-3 inset-x-3 z-50 flex flex-col items-center md:hidden animate-in fade-in-0 zoom-in-95 duration-150">
        <div className="w-full h-12 px-4 rounded-full bg-card border border-border shadow-2xl shadow-black/60 flex items-center justify-between text-foreground">
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <Search className="size-4.5 text-brand shrink-0" strokeWidth={2} />
            <input
              ref={mobileInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search movies, TV shows, games..."
              className="w-full bg-transparent text-[14px] text-foreground placeholder:text-muted-foreground outline-none"
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
              className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-foreground hover:bg-secondary cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="w-full mt-2 bg-popover/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl shadow-black/60 overflow-hidden max-h-[75vh]">
          <SearchDropdownContent />
        </div>
      </div>
    </>
  );
}
