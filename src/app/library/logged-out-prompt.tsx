"use client";

import { Bookmark, LogIn } from "lucide-react";
import { openAuthModal } from "@/lib/auth-events";

export function LibraryLoggedOutPrompt() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-24 px-4 max-w-md mx-auto border border-dashed border-border rounded-3xl bg-card/40 my-6">
      <div className="w-16 h-16 rounded-2xl bg-muted/80 border border-border flex items-center justify-center text-muted-foreground mb-4 shadow-xs">
        <Bookmark className="w-8 h-8" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Please sign in to view your library</h2>
      <p className="text-xs sm:text-sm text-muted-foreground mt-2 max-w-xs leading-relaxed">
        Track your backlog, currently active games & shows, and completed favorites all in one
        place.
      </p>
      <button
        type="button"
        onClick={() => openAuthModal()}
        className="mt-6 px-6 py-2.5 rounded-full bg-foreground text-background text-xs font-bold hover:opacity-90 transition cursor-pointer flex items-center gap-2 shadow-xs"
      >
        <LogIn className="w-4 h-4" />
        <span>Sign In</span>
      </button>
    </div>
  );
}
