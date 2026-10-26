"use client";

import {
  Bookmark,
  Calendar,
  Compass,
  Film,
  Home,
  LogOut,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { DropdownMenu } from "radix-ui";
import { useEffect, useState } from "react";
import { PosterToggle } from "@/components/poster-toggle";
import { SearchModal } from "@/components/search-modal";
import type { CurrentUser } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { SEARCH_MODAL_EVENT } from "@/lib/auth-events";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Explore", href: "/explore" },
  { label: "Library", href: "/library" },
  { label: "Calendar", href: "/calendar" },
];

interface NavBarProps {
  user: CurrentUser;
  isAdmin?: boolean;
}

export function NavBar({ user, isAdmin = false }: NavBarProps) {
  const pathname = usePathname();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  useEffect(() => {
    const handleOpenSearch = () => setIsSearchOpen(true);
    window.addEventListener(SEARCH_MODAL_EVENT, handleOpenSearch);
    return () => window.removeEventListener(SEARCH_MODAL_EVENT, handleOpenSearch);
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

  const isHome = pathname === "/" || pathname === "";
  const isExplore = pathname.startsWith("/explore");
  const isLibrary = pathname.startsWith("/library");
  const isCalendar = pathname.startsWith("/calendar");

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-background/80 backdrop-blur-md border-b border-border/30 w-full transition-colors">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Left Zone: Brand Logo + Primary Nav */}
          <div className="flex items-center gap-6 sm:gap-8">
            <Link
              href="/"
              className="flex items-center gap-2.5 group shrink-0"
              title="Tracklist"
              aria-label="Tracklist Home"
            >
              <div className="flex aspect-square size-8.5 items-center justify-center rounded-xl bg-foreground text-background shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Film className="size-4.5 stroke-[2.5]" />
              </div>
              <span className="font-bold tracking-tight text-foreground text-base sm:text-lg">
                Tracklist
              </span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
              {NAV_LINKS.map((link) => {
                const isActive =
                  link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide transition-all",
                      isActive
                        ? "bg-foreground text-background font-semibold shadow-xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Zone: Search, Poster Toggle, Theme Toggle, User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search"
              className="flex items-center gap-2 h-9 px-3 rounded-full bg-muted/40 hover:bg-muted border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition cursor-pointer"
            >
              <Search className="size-3.5" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono text-muted-foreground/70 bg-background/80 px-1.5 py-0.5 rounded border border-border/80">
                ⌘K
              </kbd>
            </button>

            <PosterToggle />

            {/* Theme Toggle */}
            {mounted && (
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
                className="size-9 rounded-full border border-border bg-muted/40 hover:bg-muted text-foreground transition cursor-pointer flex items-center justify-center"
              >
                {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
            )}

            {/* User Dropdown Menu */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  type="button"
                  className="flex items-center rounded-full p-0.5 hover:ring-2 hover:ring-ring/20 transition cursor-pointer outline-none"
                  aria-label="User account menu"
                >
                  {user.avatarUrl ? (
                    <Image
                      src={user.avatarUrl}
                      alt={user.displayName}
                      width={32}
                      height={32}
                      className="size-8 rounded-full object-cover border border-border shadow-xs"
                      unoptimized
                    />
                  ) : (
                    <div className="size-8 rounded-full bg-foreground text-background font-bold text-xs flex items-center justify-center shadow-xs">
                      {(user.displayName || user.username || "U")[0]?.toUpperCase()}
                    </div>
                  )}
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={8}
                  className="z-50 min-w-52 rounded-2xl bg-popover border border-border p-1.5 shadow-xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
                >
                  <div className="px-3 py-2 border-b border-border/40 mb-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {user.displayName}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">@{user.username}</p>
                  </div>

                  {isAdmin && (
                    <DropdownMenu.Item asChild>
                      <Link
                        href="/admin"
                        className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl text-foreground hover:bg-muted transition cursor-pointer outline-none"
                      >
                        <ShieldCheck className="size-4 text-muted-foreground" />
                        <span>Admin Console</span>
                      </Link>
                    </DropdownMenu.Item>
                  )}

                  <DropdownMenu.Item asChild>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl text-foreground hover:bg-muted transition cursor-pointer outline-none"
                    >
                      <Settings className="size-4 text-muted-foreground" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenu.Item>

                  <DropdownMenu.Separator className="h-px bg-border/40 my-1" />

                  <DropdownMenu.Item
                    onSelect={handleLogout}
                    className="flex items-center gap-2.5 px-3 py-2 text-xs rounded-xl text-destructive hover:bg-destructive/10 transition cursor-pointer outline-none"
                  >
                    <LogOut className="size-4" />
                    <span>Log out</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Dock */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-xl border-t border-border py-2 px-6 flex justify-around">
        <Link
          href="/"
          className={`p-2 rounded-lg ${isHome ? "text-foreground font-bold" : "text-muted-foreground"}`}
          aria-label="Home"
        >
          <Home className="w-5 h-5 stroke-[2.2]" />
        </Link>
        <Link
          href="/explore"
          className={`p-2 rounded-lg ${isExplore ? "text-foreground font-bold" : "text-muted-foreground"}`}
          aria-label="Explore"
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
          href="/library"
          className={`p-2 rounded-lg ${isLibrary ? "text-foreground font-bold" : "text-muted-foreground"}`}
          aria-label="Library"
        >
          <Bookmark className="w-5 h-5 stroke-[2.2]" />
        </Link>
        <Link
          href="/calendar"
          className={`p-2 rounded-lg ${isCalendar ? "text-foreground font-bold" : "text-muted-foreground"}`}
          aria-label="Calendar"
        >
          <Calendar className="w-5 h-5 stroke-[2.2]" />
        </Link>
      </nav>

      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
}
