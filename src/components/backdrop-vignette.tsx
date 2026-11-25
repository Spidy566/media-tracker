import { cn } from "@/lib/utils";

export function BannerVignette({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("absolute inset-0 pointer-events-none z-10", className)}
      style={{
        backgroundImage:
          "radial-gradient(ellipse 120% 100% at 50% 40%, transparent 55%, color-mix(in oklab, var(--background) 65%, transparent) 100%), linear-gradient(to bottom, transparent 55%, var(--background) 100%)",
      }}
    />
  );
}
