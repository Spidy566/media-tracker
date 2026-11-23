"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { MobileNav } from "@/components/navbar/mobile-nav";
import { NavActions } from "@/components/navbar/nav-actions";
import { NavTabs } from "@/components/navbar/nav-tabs";
import { SearchModal } from "@/components/search-modal";
import { openSearch } from "@/hooks/use-search-modal";
import type { CurrentUser } from "@/lib/auth";

interface NavBarProps {
  user: CurrentUser;
  isAdmin?: boolean;
}

export function NavBar({ user, isAdmin = false }: NavBarProps) {
  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 w-full px-6 sm:px-8 md:px-10 lg:px-12 h-20 bg-background/90 backdrop-blur-md border-b border-border pointer-events-auto">
        <div className="w-full h-full grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Left Column: Logo + Tabs */}
          <div className="flex items-center justify-start">
            <div className="flex items-center gap-6 sm:gap-7 h-14">
              <Link
                href="/"
                onClick={handleLogoClick}
                aria-label="Tracklist Home"
                title="Tracklist Home"
                className="group flex items-center justify-center size-9 rounded-full text-foreground transition-opacity duration-150 hover:opacity-80 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 select-none shrink-0"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="transition-transform duration-200 group-hover:scale-105"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.75" />
                  <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
                  <circle cx="12" cy="12" r="1.5" fill="currentColor" />
                </svg>
              </Link>

              <NavTabs />
            </div>
          </div>

          {/* Center Column: Search Pill */}
          <div className="hidden md:flex items-center justify-center pointer-events-auto">
            <button
              type="button"
              onClick={openSearch}
              className="flex items-center justify-between w-64 lg:w-80 h-10 px-3.5 rounded-full bg-card/60 hover:bg-card border border-border text-muted-foreground hover:text-foreground text-xs font-medium transition shadow-xs group cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Search className="size-4 text-brand" strokeWidth={2} />
                <span>Search movies, shows, games...</span>
              </div>
              <kbd className="hidden sm:inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted border border-border text-muted-foreground group-hover:text-foreground">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right Column: Actions */}
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-3 h-14">
              {/* Mobile Search Icon Button */}
              <button
                type="button"
                onClick={openSearch}
                aria-label="Search media"
                className="md:hidden flex items-center justify-center size-10 rounded-full border border-border bg-card/60 hover:bg-card text-muted-foreground hover:text-foreground transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 select-none"
              >
                <Search className="size-5" strokeWidth={1.75} />
              </button>

              <NavActions user={user} isAdmin={isAdmin} />
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileNav />

      {/* Global Search Dialog */}
      <SearchModal />
    </>
  );
}
