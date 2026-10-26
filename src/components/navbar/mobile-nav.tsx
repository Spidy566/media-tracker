"use client";

import { Bookmark, Compass, Home, Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { openSearchModal } from "@/lib/auth-events";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const pathname = usePathname();

  const isHomeActive = pathname === "/" || pathname === "";
  const isShelfActive = pathname.startsWith("/shelf") || pathname.startsWith("/library");
  const isDiscoverActive = pathname.startsWith("/discover") || pathname.startsWith("/explore");

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#1a1a1a]/95 backdrop-blur-xl border-t border-white/8 px-4 py-2 safe-area-pb"
    >
      <div className="flex items-center justify-around max-w-sm mx-auto">
        {/* Home */}
        <Link
          href="/"
          aria-current={isHomeActive ? "page" : undefined}
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-3 text-[11px] transition-colors rounded-lg outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 select-none",
            isHomeActive
              ? "text-white font-medium"
              : "text-neutral-400 hover:text-white font-normal",
          )}
        >
          <Home className="size-5" strokeWidth={isHomeActive ? 2.2 : 1.75} />
          <span>Home</span>
        </Link>

        {/* Shelf */}
        <Link
          href="/shelf"
          aria-current={isShelfActive ? "page" : undefined}
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-3 text-[11px] transition-colors rounded-lg outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 select-none",
            isShelfActive
              ? "text-white font-medium"
              : "text-neutral-400 hover:text-white font-normal",
          )}
        >
          <Bookmark className="size-5" strokeWidth={isShelfActive ? 2.2 : 1.75} />
          <span>Shelf</span>
        </Link>

        {/* Centered + Log action button */}
        <button
          type="button"
          onClick={openSearchModal}
          aria-label="Log media"
          className="flex items-center justify-center size-10 rounded-full border border-white/15 bg-white/6 hover:bg-white/12 text-white transition-all duration-150 active:scale-95 cursor-pointer shadow-xs outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
        >
          <Plus className="size-5 stroke-[2.2]" />
        </button>

        {/* Discover */}
        <Link
          href="/discover"
          aria-current={isDiscoverActive ? "page" : undefined}
          className={cn(
            "flex flex-col items-center gap-1 py-1 px-3 text-[11px] transition-colors rounded-lg outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 select-none",
            isDiscoverActive
              ? "text-white font-medium"
              : "text-neutral-400 hover:text-white font-normal",
          )}
        >
          <Compass className="size-5" strokeWidth={isDiscoverActive ? 2.2 : 1.75} />
          <span>Discover</span>
        </Link>
      </div>
    </nav>
  );
}
