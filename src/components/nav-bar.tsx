"use client";

import { Bookmark, Compass, Film, Home, Search } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchModal } from "@/components/search-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveUser } from "@/hooks/use-active-user";

export function NavBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { users, currentUser, setActiveUser } = useActiveUser();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isHome = pathname === "/" && !searchParams.get("tab");
  const isExplore = pathname === "/explore";
  const isMyList = pathname === "/" && searchParams.get("tab") === "me";

  // Global ⌘K / Ctrl+K keyboard shortcut
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
      {/* ─────────────────────────────────────────────────────────────
          1. TOP NAVBAR (Static on Desktop, Minimal on Mobile)
      ───────────────────────────────────────────────────────────── */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo & Desktop Nav Links */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-100 group-hover:border-zinc-500 transition">
                <Film className="w-3.5 h-3.5 text-zinc-300" />
              </div>
              <span className="font-bold text-sm tracking-tight text-zinc-100 group-hover:text-white transition">
                Tracklist
              </span>
            </Link>

            {/* Desktop-only Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  isHome
                    ? "bg-zinc-800 text-zinc-100 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                Home
              </Link>
              <Link
                href="/explore"
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  isExplore
                    ? "bg-zinc-800 text-zinc-100 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                Explore
              </Link>
            </nav>
          </div>

          {/* Quick Search & Friend Switcher */}
          <div className="flex items-center gap-3">
            {/* Desktop Search Trigger */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="hidden md:flex items-center gap-2.5 h-8 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <span>Search movies, shows, games...</span>
              <kbd className="inline-flex items-center gap-0.5 ml-3 px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-400 rounded border border-zinc-700/50">
                ⌘K
              </kbd>
            </button>

            {/* Friend Switcher (Always visible on mobile & desktop) */}
            {currentUser && (
              <div className="flex items-center pl-2 md:border-l md:border-zinc-800">
                <Select value={currentUser.id} onValueChange={setActiveUser}>
                  <SelectTrigger className="h-8 text-xs font-medium border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          2. MOBILE BOTTOM TAB BAR (Yamtrack / Native App Style)
      ───────────────────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-950/90 backdrop-blur-md border-t border-zinc-800/80 px-2 py-1.5 safe-area-pb">
        <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
          {/* 1. Home */}
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-1 rounded-lg transition ${
              isHome ? "text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Home className={`w-4 h-4 ${isHome ? "text-zinc-100" : "text-zinc-400"}`} />
            <span className="text-[10px] font-medium mt-0.5">Home</span>
          </Link>

          {/* 2. Explore */}
          <Link
            href="/explore"
            className={`flex flex-col items-center justify-center py-1 rounded-lg transition ${
              isExplore ? "text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Compass className={`w-4 h-4 ${isExplore ? "text-zinc-100" : "text-zinc-400"}`} />
            <span className="text-[10px] font-medium mt-0.5">Explore</span>
          </Link>

          {/* 3. Search */}
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex flex-col items-center justify-center py-1 rounded-lg text-zinc-400 hover:text-zinc-200 transition cursor-pointer"
          >
            <Search className="w-4 h-4" />
            <span className="text-[10px] font-medium mt-0.5">Search</span>
          </button>

          {/* 4. My List */}
          <button
            type="button"
            onClick={() => router.push("/?tab=me")}
            className={`flex flex-col items-center justify-center py-1 rounded-lg transition cursor-pointer ${
              isMyList ? "text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isMyList ? "text-zinc-100" : "text-zinc-400"}`} />
            <span className="text-[10px] font-medium mt-0.5">My List</span>
          </button>
        </div>
      </nav>

      {/* Global Search Modal */}
      {currentUser && (
        <SearchModal
          userId={currentUser.id}
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </>
  );
}
