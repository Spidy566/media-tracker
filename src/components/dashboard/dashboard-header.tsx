"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { openSearch } from "@/hooks/use-search-modal";
import type { EntryUser } from "@/types/entry";

export interface LibraryCounts {
  doingCount: number;
  queueCount: number;
  doneCount: number;
  totalCount: number;
}

interface DashboardHeaderProps {
  currentUser: EntryUser | null;
  libraryCounts: LibraryCounts;
}

export function DashboardHeader({ currentUser, libraryCounts }: DashboardHeaderProps) {
  return (
    <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground font-sans">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Welcome back{currentUser?.displayName ? `, ${currentUser.displayName}` : ""}.
          </p>
        </div>

        <button
          type="button"
          onClick={openSearch}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-card hover:bg-muted border border-border text-foreground text-xs font-semibold transition cursor-pointer shadow-2xs hover:border-border/80 self-start sm:self-auto shrink-0"
        >
          <Plus className="size-3.5 text-brand stroke-[2.5]" />
          <span>Log Media</span>
          <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground bg-muted/60 border border-border rounded-md">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Live Counts Pulse Strip */}
      <div className="flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-card border border-border overflow-x-auto scrollbar-none shadow-2xs self-start lg:self-auto shrink-0">
        <Link
          href="/library?status=doing"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/70 text-xs transition cursor-pointer shrink-0"
        >
          <span className="size-2 rounded-full bg-status-doing shadow-xs shadow-status-doing animate-pulse shrink-0" />
          <span className="text-muted-foreground font-medium">In Progress</span>
          <span className="text-foreground font-semibold font-mono tabular-nums">
            {libraryCounts.doingCount}
          </span>
        </Link>
        <div className="w-px h-3.5 bg-border shrink-0" />
        <Link
          href="/library?status=want_to"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/70 text-xs transition cursor-pointer shrink-0"
        >
          <span className="size-2 rounded-full bg-status-queue shadow-xs shadow-status-queue shrink-0" />
          <span className="text-muted-foreground font-medium">Queue</span>
          <span className="text-foreground font-semibold font-mono tabular-nums">
            {libraryCounts.queueCount}
          </span>
        </Link>
        <div className="w-px h-3.5 bg-border shrink-0" />
        <Link
          href="/library?status=done"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/70 text-xs transition cursor-pointer shrink-0"
        >
          <span className="size-2 rounded-full bg-status-done shadow-xs shadow-status-done shrink-0" />
          <span className="text-muted-foreground font-medium">Done</span>
          <span className="text-foreground font-semibold font-mono tabular-nums">
            {libraryCounts.doneCount}
          </span>
        </Link>
        <div className="w-px h-3.5 bg-border shrink-0" />
        <Link
          href="/library"
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-muted/70 text-xs transition cursor-pointer shrink-0"
        >
          <span className="size-2 rounded-full bg-brand shadow-xs shadow-brand/40 shrink-0" />
          <span className="text-muted-foreground font-medium">Total</span>
          <span className="text-foreground font-semibold font-mono tabular-nums">
            {libraryCounts.totalCount}
          </span>
        </Link>
      </div>
    </section>
  );
}
