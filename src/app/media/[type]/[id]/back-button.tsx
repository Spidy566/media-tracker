"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface BackButtonProps {
  className?: string;
}

export function BackButton({ className }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined") {
      try {
        const hasHistory = window.history.length > 1;
        const referrerSameOrigin =
          Boolean(document.referrer) &&
          new URL(document.referrer, window.location.href).origin === window.location.origin;

        if (hasHistory && referrerSameOrigin) {
          router.back();
          return;
        }
      } catch {
        // Fallback to push home on URL parse error
      }
    }
    router.push("/");
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Go back"
      className={`size-10 sm:w-auto sm:px-3 rounded-xl border border-border bg-background/60 hover:bg-background/80 backdrop-blur-md inline-flex items-center justify-center gap-2 text-xs font-semibold text-foreground transition shadow-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer select-none ${className || ""}`.trim()}
    >
      <ArrowLeft className="size-4 shrink-0" />
      <span className="hidden sm:inline">Back</span>
    </button>
  );
}
