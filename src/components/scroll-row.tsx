"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface ScrollRowProps {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function ScrollRow({
  title,
  action,
  children,
  className,
  contentClassName,
}: ScrollRowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const overflow = scrollWidth > clientWidth + 2;
    setHasOverflow(overflow);
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    checkScroll();

    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  const scroll = (direction: "left" | "right") => {
    const el = rowRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.85;
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <div className={cn("space-y-4 group/row", className)}>
      {/* Header Row: Title on the left, optional action link and arrows on the right */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          {typeof title === "string" ? (
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground truncate">
              {title}
            </h2>
          ) : (
            title
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {action && <div className="flex items-center">{action}</div>}

          {/* Scroll arrow buttons: size-9, rounded-full, appear on row hover */}
          {hasOverflow && (
            <div className="flex [@media(hover:none)]:hidden items-center gap-1.5 opacity-70 group-hover/row:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={() => scroll("left")}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
                className="size-9 rounded-full border border-white/10 bg-card hover:bg-neutral-800 text-foreground flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer disabled:opacity-30 disabled:pointer-events-none disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => scroll("right")}
                disabled={!canScrollRight}
                aria-label="Scroll right"
                className="size-9 rounded-full border border-white/10 bg-card hover:bg-neutral-800 text-foreground flex items-center justify-center transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer disabled:opacity-30 disabled:pointer-events-none disabled:cursor-not-allowed shadow-sm"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Row container with edge fades and floating hover arrows */}
      <div className="relative">
        {/* Floating Left Arrow on Hover */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Scroll left"
            className="[@media(hover:none)]:hidden opacity-0 group-hover/row:opacity-100 transition-opacity absolute left-2 top-1/2 -translate-y-1/2 z-30 size-11 rounded-full bg-black/80 hover:bg-black text-white border border-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer shadow-xl focus:opacity-100"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}

        {/* Left edge fade only when more content on the left */}
        {canScrollLeft && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 bottom-3 w-12 sm:w-16 bg-linear-to-r from-background to-transparent z-10 transition-opacity duration-200"
          />
        )}

        {/* Scrollable track */}
        <div
          ref={rowRef}
          className={cn(
            "overflow-x-auto snap-x snap-mandatory flex gap-5 scroll-smooth no-scrollbar pb-3",
            contentClassName,
          )}
        >
          {children}
        </div>

        {/* Right edge fade only when more content on the right */}
        {canScrollRight && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-3 w-12 sm:w-16 bg-linear-to-l from-background to-transparent z-10 transition-opacity duration-200"
          />
        )}

        {/* Floating Right Arrow on Hover */}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Scroll right"
            className="[@media(hover:none)]:hidden opacity-0 group-hover/row:opacity-100 transition-opacity absolute right-2 top-1/2 -translate-y-1/2 z-30 size-11 rounded-full bg-black/80 hover:bg-black text-white border border-white/20 backdrop-blur-md flex items-center justify-center cursor-pointer shadow-xl focus:opacity-100"
          >
            <ChevronRight className="size-5" />
          </button>
        )}
      </div>
    </div>
  );
}
