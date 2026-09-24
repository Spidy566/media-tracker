"use client";

import { Film, Search } from "lucide-react";
import Link from "next/link";
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
  const { users, currentUser, setActiveUser } = useActiveUser();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Global ⌘K / Ctrl+K keyboard shortcut to open search
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
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo & Navigation */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-100 group-hover:border-zinc-500 transition">
                <Film className="w-3.5 h-3.5 text-zinc-300" />
              </div>
              <span className="font-bold text-sm tracking-tight text-zinc-100 group-hover:text-white transition">
                Tracklist
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-1">
              <Link
                href="/"
                className="px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/50 rounded-md transition"
              >
                Home
              </Link>
              <Link
                href="/explore"
                className="px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-md transition"
              >
                Explore
              </Link>
            </nav>
          </div>

          {/* Quick Search & Friend Switcher */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2.5 h-8 px-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5 text-zinc-500" />
              <span className="hidden md:inline">Search movies, shows, games...</span>
              <span className="md:hidden">Search</span>
              <kbd className="hidden md:inline-flex items-center gap-0.5 ml-3 px-1.5 py-0.5 text-[10px] font-mono bg-zinc-800 text-zinc-400 rounded border border-zinc-700/50">
                ⌘K
              </kbd>
            </button>

            {/* Friend Switcher */}
            {currentUser && (
              <div className="flex items-center pl-2 border-l border-zinc-800">
                <Select value={currentUser.id} onValueChange={setActiveUser}>
                  <SelectTrigger className="h-8 text-xs font-medium border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-700 focus:ring-0 focus:border-zinc-600">
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
