"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDiscover } from "@/components/discover/discover-context";
import { MobileNav } from "@/components/navbar/mobile-nav";
import { NavActions } from "@/components/navbar/nav-actions";
import { NavTabs } from "@/components/navbar/nav-tabs";
import { SearchManager } from "@/components/navbar/search-manager";
import { SearchTrigger } from "@/components/navbar/search-trigger";
import type { CurrentUser } from "@/lib/auth";
import { openSearchModal } from "@/lib/auth-events";
import { cn } from "@/lib/utils";

interface NavBarProps {
  user: CurrentUser;
  isAdmin?: boolean;
}

export function NavBar({ user, isAdmin = false }: NavBarProps) {
  const pathname = usePathname();
  const isDiscover = pathname === "/discover" || pathname.startsWith("/discover/");
  const { isIslandMode, toggleIslandMode } = useDiscover();

  // Island navbar ONLY exists on /discover when toggled on desktop
  const isIsland = isDiscover && isIslandMode;

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (isDiscover) {
      e.preventDefault();
      // Skip island state on mobile (<768px) and keep the flat bar
      if (typeof window !== "undefined" && window.innerWidth < 768) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      toggleIslandMode();
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <>
      <header
        data-island={isIsland}
        className={cn(
          "fixed top-0 inset-x-0 z-40 w-full px-6 sm:px-8 md:px-10 lg:px-12 h-20 transition-all duration-300 ease-out motion-reduce:transition-none",
          isIsland
            ? "md:bg-transparent md:border-transparent md:pointer-events-none md:pt-3.5 bg-[#141418]/90 backdrop-blur-md border-b border-white/8 pointer-events-auto pt-0"
            : "bg-[#141418]/90 backdrop-blur-md border-b border-white/8 pointer-events-auto pt-0",
        )}
      >
        <div className="w-full h-full grid grid-cols-[1fr_auto_1fr] items-center">
          {/* Left Column: Logo + Tabs */}
          <div className="flex items-center justify-start">
            <div
              className={cn(
                "flex items-center gap-6 sm:gap-7 transition-all duration-300 ease-out motion-reduce:transition-none pointer-events-auto",
                isIsland
                  ? "md:h-13 md:px-5 md:rounded-full md:bg-[#222228]/95 md:backdrop-blur-xl md:border md:border-white/10 md:shadow-xl md:shadow-black/50 h-14 px-0 bg-transparent border-transparent shadow-none"
                  : "h-14 px-0 bg-transparent border border-transparent shadow-none",
              )}
            >
              <Link
                href="/"
                onClick={handleLogoClick}
                aria-label={isDiscover ? "Toggle island navbar" : "Tracklist Home"}
                title={isDiscover ? "Click to toggle island navbar" : "Tracklist Home"}
                className="group flex items-center justify-center size-9 rounded-full text-white transition-opacity duration-150 hover:opacity-80 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 select-none shrink-0"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={cn(
                    "transition-transform duration-200 group-hover:scale-105",
                    isDiscover && "text-brand",
                  )}
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
            <SearchTrigger isIsland={isIsland} />
          </div>

          {/* Right Column: Actions */}
          <div className="flex items-center justify-end">
            <div
              className={cn(
                "flex items-center gap-3 transition-all duration-300 ease-out motion-reduce:transition-none pointer-events-auto",
                isIsland
                  ? "md:h-13 md:px-4 md:rounded-full md:bg-[#222228]/95 md:backdrop-blur-xl md:border md:border-white/10 md:shadow-xl md:shadow-black/50 h-14 px-0 bg-transparent border-transparent shadow-none"
                  : "h-14 px-0 bg-transparent border border-transparent shadow-none",
              )}
            >
              {/* Mobile Search Icon Button */}
              <button
                type="button"
                onClick={openSearchModal}
                aria-label="Search media"
                className="md:hidden flex items-center justify-center size-10 rounded-full border border-white/10 bg-white/4 hover:bg-white/8 text-neutral-300 hover:text-white transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 select-none"
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
