import { cn } from "@/lib/utils";

export const BANNER_HEIGHT = "h-[20rem] sm:h-[30rem] lg:h-[34rem]";

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
