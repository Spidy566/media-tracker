"use client";

import {
  ArrowUpRight,
  Film,
  LogOut,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Dialog } from "radix-ui";
import { useEffect, useState } from "react";
import { PosterToggle } from "@/components/poster-toggle";
import type { CurrentUser } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { openSearchModal } from "@/lib/auth-events";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { title: "Home", url: "/" },
  { title: "Explore", url: "/explore" },
  { title: "Library", url: "/library" },
  { title: "Calendar", url: "/calendar" },
];

interface MenuCardProps {
  isOpen: boolean;
  onClose: () => void;
  user: CurrentUser;
  isAdmin?: boolean;
}

export function MenuCard({ isOpen, onClose, user, isAdmin = false }: MenuCardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isDark = resolvedTheme === "dark";
  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      onClose();
      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Close card automatically on route change
  useEffect(() => {
    if (pathname) {
      onClose();
    }
  }, [pathname, onClose]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-200" />

        {/* Floating Menu Card */}
        <Dialog.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed top-3 left-3 bottom-3 z-50 w-[min(24rem,calc(100vw-1.5rem))] rounded-3xl bg-popover border border-border p-6 shadow-2xl flex flex-col justify-between overflow-y-auto no-scrollbar outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left duration-300"
        >
          <Dialog.Title className="sr-only">Menu</Dialog.Title>
          <Dialog.Description className="sr-only">Navigation and user settings</Dialog.Description>

          {/* Header */}
          <div className="flex items-center justify-between">
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close menu"
                onMouseDown={(e) => e.preventDefault()}
                className="size-10 rounded-xl border border-border bg-card/80 hover:bg-card text-foreground transition cursor-pointer shadow-xs flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <X className="size-5" />
              </button>
            </Dialog.Close>

            <div className="flex items-center gap-2.5">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-foreground text-background shrink-0 shadow-xs">
                <Film className="size-4.5 stroke-[2.5]" />
              </div>
              <span className="font-semibold tracking-tight text-foreground text-xl">
                Tracklist
              </span>
            </div>
          </div>

          {/* Main Navigation Rows */}
          <nav className="flex flex-col my-auto py-2" aria-label="Menu links">
            {NAV_ITEMS.map((item) => {
              const isActive = item.url === "/" ? pathname === "/" : pathname.startsWith(item.url);

              return (
                <Link
                  key={item.title}
                  href={item.url}
                  onClick={onClose}
                  className="flex items-center justify-between py-3 group transition-colors"
                >
                  <span
                    className={cn(
                      "text-2xl font-medium tracking-tight transition-colors",
                      isActive
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground group-hover:text-foreground",
                    )}
                  >
                    {item.title}
                  </span>
                  <div
                    className={cn(
                      "size-8 rounded-full flex items-center justify-center transition-all shrink-0",
                      isActive
                        ? "bg-foreground text-background shadow-xs"
                        : "bg-muted text-muted-foreground group-hover:bg-foreground/10 group-hover:text-foreground",
                    )}
                  >
                    <ArrowUpRight className="size-4 stroke-[2.5]" />
                  </div>
                </Link>
              );
            })}

            {isAdmin && (
              <Link
                href="/admin"
                onClick={onClose}
                className="flex items-center justify-between py-3 group transition-colors"
              >
                <span
                  className={cn(
                    "text-2xl font-medium tracking-tight transition-colors",
                    pathname.startsWith("/admin")
                      ? "text-brand font-semibold"
                      : "text-muted-foreground group-hover:text-brand",
                  )}
                >
                  Admin
                </span>
                <div
                  className={cn(
                    "size-8 rounded-full flex items-center justify-center transition-all shrink-0",
                    pathname.startsWith("/admin")
                      ? "bg-brand text-brand-foreground shadow-xs"
                      : "bg-muted text-muted-foreground group-hover:bg-brand/10 group-hover:text-brand",
                  )}
                >
                  <ShieldCheck className="size-4 stroke-[2.5]" />
                </div>
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                openSearchModal();
              }}
              className="flex items-center justify-between py-3 group transition-colors w-full text-left cursor-pointer"
            >
              <span className="text-2xl font-medium tracking-tight text-muted-foreground group-hover:text-foreground transition-colors">
                Search
              </span>
              <div className="size-8 rounded-full flex items-center justify-center transition-all shrink-0 bg-muted text-muted-foreground group-hover:bg-foreground/10 group-hover:text-foreground">
                <Search className="size-4 stroke-[2.5]" />
              </div>
            </button>
          </nav>

          {/* Secondary Actions & Bottom Card */}
          <div className="flex flex-col">
            {/* Divider */}
            <div className="h-px bg-border my-4" />

            {/* Two-Column Grid of Small Links */}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link
                href="/settings"
                onClick={onClose}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/60 text-muted-foreground hover:text-foreground font-medium transition"
              >
                <Settings className="size-4 shrink-0" />
                <span>Settings</span>
              </Link>

              <button
                type="button"
                onClick={toggleTheme}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted/60 text-muted-foreground hover:text-foreground font-medium transition cursor-pointer text-left"
              >
                {isDark ? (
                  <Sun className="size-4 shrink-0" />
                ) : (
                  <Moon className="size-4 shrink-0" />
                )}
                <span>{isDark ? "Light theme" : "Dark theme"}</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive font-medium transition cursor-pointer text-left col-span-2 disabled:opacity-50"
              >
                <LogOut className="size-4 shrink-0" />
                <span>{isLoggingOut ? "Signing out..." : "Log out"}</span>
              </button>
            </div>

            {/* Bottom Card (Profile Box) */}
            <div className="rounded-2xl border border-border bg-card/60 p-4 mt-4 flex items-center justify-between gap-3 shadow-xs">
              <Link
                href={`/squad/${user.username}`}
                onClick={onClose}
                className="flex items-center gap-3 min-w-0 flex-1 hover:opacity-85 transition rounded-xl"
                title="View profile"
              >
                <div className="size-10 rounded-full bg-muted border border-border flex items-center justify-center text-sm font-semibold text-foreground shrink-0 shadow-xs">
                  {user.displayName[0]?.toUpperCase()}
                </div>
                <div className="flex flex-col min-w-0 leading-tight">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {user.displayName}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">@{user.username}</span>
                </div>
              </Link>

              <div className="shrink-0">
                <PosterToggle />
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
