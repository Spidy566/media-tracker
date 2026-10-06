"use client";

import { Bookmark, Calendar, Compass, Film, Home, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { SearchModal } from "@/components/search-modal";
import { ThemeToggle } from "@/components/theme-toggle";
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
  const { users, currentUser, setActiveUser } = useActiveUser();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const isHome = pathname === "/";
  const isExplore = pathname === "/explore";
  const isCalendar = pathname === "/calendar";
  const isLibrary = pathname === "/library";

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
      <header className="border-b border-border bg-card/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-6">
          {/* Logo & Navigation Tabs */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center font-black text-sm shadow-sm group-hover:scale-105 transition">
                <Film className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span className="font-extrabold text-base tracking-tight text-foreground">
                Tracklist
              </span>
            </Link>

            <nav className="hidden md:flex items-center bg-muted/60 p-1 rounded-full border border-border">
              <Link
                href="/"
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition ${
                  isHome
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/explore"
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition ${
                  isExplore
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Explore
              </Link>
              <Link
                href="/calendar"
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition ${
                  isCalendar
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Calendar
              </Link>
              <Link
                href="/library"
                className={`px-4 py-1.5 text-xs font-bold rounded-full transition ${
                  isLibrary
                    ? "bg-foreground text-background shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Library
              </Link>
            </nav>
          </div>

          {/* Right Action Island: Search + Theme Toggle + User Switcher */}
          <div className="flex items-center gap-2.5">
            {/* Single Unified Search Button */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="flex items-center gap-2.5 h-9 px-3.5 rounded-full bg-muted/50 hover:bg-muted border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search titles...</span>
              <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-background text-muted-foreground border border-border">
                ⌘K
              </kbd>
            </button>

            {/* Sun / Moon Theme Switcher */}
            <ThemeToggle />

            {/* Active User Switcher */}
            {currentUser && (
              <Select value={currentUser.id} onValueChange={setActiveUser}>
                <SelectTrigger className="h-9 rounded-full border-border bg-card text-foreground px-3 text-xs font-semibold cursor-pointer hover:bg-muted gap-2 shadow-xs">
                  <div className="w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black">
                    {currentUser.displayName[0]}
                  </div>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-popover-foreground rounded-xl shadow-xl">
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id} className="text-xs font-medium py-1.5">
                      {u.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Dock */}
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

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
