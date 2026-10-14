"use client";

import { Bookmark, Calendar, Compass, Film, Home, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/auth-modal";
import { MenuCard } from "@/components/menu-card";
import { PosterToggle } from "@/components/poster-toggle";
import { SearchModal } from "@/components/search-modal";
import { AUTH_MODAL_EVENT } from "@/lib/auth-events";
import { cn } from "@/lib/utils";

export function NavBar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const isHome = pathname === "/";
  const isExplore = pathname.startsWith("/explore");
  const isLibrary = pathname.startsWith("/library");
  const isCalendar = pathname.startsWith("/calendar");

  useEffect(() => {
    const handleOpenAuth = () => setIsAuthOpen(true);
    window.addEventListener(AUTH_MODAL_EVENT, handleOpenAuth);
    return () => window.removeEventListener(AUTH_MODAL_EVENT, handleOpenAuth);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b border-border/30 w-full transition-colors">
        <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left Zone: Menu Button */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open menu"
              className="size-10 rounded-xl border border-border bg-card/80 hover:bg-card text-foreground transition cursor-pointer shadow-xs flex items-center justify-center focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Menu className="size-5" />
            </button>
          </div>

          {/* Center Zone: Home · Explore · [Tracklist logo mark] · Library · Calendar */}
          <nav className="flex items-center gap-2.5 sm:gap-3.5" aria-label="Main Navigation">
            {/* Desktop Left Links: Home · Explore */}
            <div className="hidden md:flex items-center gap-2.5 sm:gap-3.5">
              <Link
                href="/"
                className={cn(
                  "relative py-1 text-xs font-medium uppercase tracking-wide transition-colors",
                  isHome
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Home
                {isHome && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-brand" />
                )}
              </Link>
              <span className="text-muted-foreground/30 text-xs select-none" aria-hidden="true">
                ·
              </span>
              <Link
                href="/explore"
                className={cn(
                  "relative py-1 text-xs font-medium uppercase tracking-wide transition-colors",
                  isExplore
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Explore
                {isExplore && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-brand" />
                )}
              </Link>
              <span className="text-muted-foreground/30 text-xs select-none" aria-hidden="true">
                ·
              </span>
            </div>

            {/* Tracklist Logo Mark */}
            <Link
              href="/"
              className="flex items-center group px-1"
              title="Tracklist"
              aria-label="Tracklist home"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-foreground text-background shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Film className="size-4.5 stroke-[2.5]" />
              </div>
            </Link>

            {/* Desktop Right Links: Library · Calendar */}
            <div className="hidden md:flex items-center gap-2.5 sm:gap-3.5">
              <span className="text-muted-foreground/30 text-xs select-none" aria-hidden="true">
                ·
              </span>
              <Link
                href="/library"
                className={cn(
                  "relative py-1 text-xs font-medium uppercase tracking-wide transition-colors",
                  isLibrary
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Library
                {isLibrary && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-brand" />
                )}
              </Link>
              <span className="text-muted-foreground/30 text-xs select-none" aria-hidden="true">
                ·
              </span>
              <Link
                href="/calendar"
                className={cn(
                  "relative py-1 text-xs font-medium uppercase tracking-wide transition-colors",
                  isCalendar
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                Calendar
                {isCalendar && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 size-1 rounded-full bg-brand" />
                )}
              </Link>
            </div>
          </nav>

          {/* Right Zone: Search button (no ⌘K badge) & Poster Toggle */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2 h-9 px-3.5 rounded-full bg-muted/50 hover:bg-muted border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition cursor-pointer focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Search titles...</span>
            </button>

            <PosterToggle />
          </div>
        </div>
      </header>

      {/* Mobile Bottom Dock (Retained) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border py-2 px-6 flex justify-around">
        <Link
          href="/"
          className={`p-2 rounded-lg ${isHome ? "text-foreground font-bold" : "text-muted-foreground"}`}
        >
          <Home className="w-5 h-5 stroke-[2.2]" />
        </Link>
        <Link
          href="/explore"
          className={`p-2 rounded-lg ${isExplore ? "text-foreground font-bold" : "text-muted-foreground"}`}
        >
          <Compass className="w-5 h-5 stroke-[2.2]" />
        </Link>
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          className="p-2 text-muted-foreground"
          aria-label="Search"
        >
          <Search className="w-5 h-5 stroke-[2.2]" />
        </button>
        <Link
          href="/calendar"
          className={`p-2 rounded-lg ${isCalendar ? "text-foreground font-bold" : "text-muted-foreground"}`}
        >
          <Calendar className="w-5 h-5 stroke-[2.2]" />
        </Link>
        <Link
          href="/library"
          className={`p-2 rounded-lg ${isLibrary ? "text-foreground font-bold" : "text-muted-foreground"}`}
        >
          <Bookmark className="w-5 h-5 stroke-[2.2]" />
        </Link>
      </nav>

      <MenuCard isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </>
  );
}
