"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { MobileNav } from "@/components/navbar/mobile-nav";
import { NavActions } from "@/components/navbar/nav-actions";
import { NavTabs } from "@/components/navbar/nav-tabs";
import { SearchManager } from "@/components/navbar/search-manager";
import { SearchTrigger } from "@/components/navbar/search-trigger";
import type { CurrentUser } from "@/lib/auth";
import { openSearchModal } from "@/lib/auth-events";

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
            <SearchTrigger />
          </div>

          {/* Right Column: Actions */}
          <div className="flex items-center justify-end">
            <div className="flex items-center gap-3 h-14">
              {/* Mobile Search Icon Button */}
              <button
                type="button"
                onClick={openSearchModal}
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

      {/* Global Search/Command Palette Manager */}
      <SearchManager />
    </>
  );
}
