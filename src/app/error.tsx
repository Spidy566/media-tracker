"use client";

import { AlertTriangle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled runtime error:", error);
  }, [error]);

  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-xs">
        <AlertTriangle className="w-8 h-8 stroke-[1.5]" />
      </div>

      <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-500 mb-2">
        Application Error
      </span>

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mb-3">
        Something went wrong
      </h1>

      <p className="text-sm text-muted-foreground max-w-md mb-8">
        An unexpected error occurred while loading this page. You can try refreshing the data or
        head back to the dashboard.
      </p>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-foreground text-background text-xs font-bold hover:opacity-90 transition cursor-pointer shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-muted border border-border text-xs font-semibold text-foreground hover:bg-muted/80 transition"
        >
          <span>Dashboard</span>
        </Link>
      </div>
    </main>
  );
}
