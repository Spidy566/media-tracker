"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UnifiedSearchResult } from "@/app/api/search/route";
import { CosmosSpinner } from "@/components/discover/cosmos-spinner";
import { type MediaStatus, PosterCard } from "@/components/discover/poster-card";
import { cn } from "@/lib/utils";

interface PosterWallProps {
  items: UnifiedSearchResult[];
  anchoredItem: UnifiedSearchResult | null;
  isIslandMode: boolean;
  trackedMap: Record<string, { id: string; status: MediaStatus }>;
  onAnchor: (item: UnifiedSearchResult) => void;
  onStatusChange: (item: UnifiedSearchResult, status: MediaStatus) => void;
  onRemoveTracked: (item: UnifiedSearchResult) => void;
}

export function PosterWall({
  items,
  anchoredItem,
  isIslandMode,
  trackedMap,
  onAnchor,
  onStatusChange,
  onRemoveTracked,
}: PosterWallProps) {
  // Mode change transition state: fade out -> show Cosmos spinner -> fade in
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [renderedIslandMode, setRenderedIslandMode] = useState(isIslandMode);
  const prevIslandModeRef = useRef(isIslandMode);

  useEffect(() => {
    if (prevIslandModeRef.current !== isIslandMode) {
      prevIslandModeRef.current = isIslandMode;
      setIsTransitioning(true);

      const timer = setTimeout(() => {
        setRenderedIslandMode(isIslandMode);
        setIsTransitioning(false);
      }, 450);

      return () => clearTimeout(timer);
    }
  }, [isIslandMode]);

  // ----------------------------------------------------
  // Island Mode: 2D Pannable Canvas with Inertia
  // ----------------------------------------------------
  const canvasRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const velocityRef = useRef({ vx: 0, vy: 0 });
  const lastTimeRef = useRef(0);
  const lastPosRef = useRef({ x: 0, y: 0 });
  const inertiaRafRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  // Sync pan ref with state
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);

  // Reset pan to center when entering island mode
  useEffect(() => {
    if (renderedIslandMode) {
      setPan({ x: 0, y: 0 });
      panRef.current = { x: 0, y: 0 };
    }
  }, [renderedIslandMode]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!renderedIslandMode) return;
    if (e.button !== 0) return; // Left click only

    // Stop existing inertia animation
    if (inertiaRafRef.current) {
      cancelAnimationFrame(inertiaRafRef.current);
      inertiaRafRef.current = null;
    }

    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      panX: panRef.current.x,
      panY: panRef.current.y,
    };
    lastPosRef.current = { x: e.clientX, y: e.clientY };
    lastTimeRef.current = performance.now();
    velocityRef.current = { vx: 0, vy: 0 };
    suppressClickRef.current = false;

    // Capture pointer
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !renderedIslandMode) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.hypot(dx, dy) > 6) {
      suppressClickRef.current = true;
    }

    const now = performance.now();
    const dt = Math.max(now - lastTimeRef.current, 10);
    const stepDx = e.clientX - lastPosRef.current.x;
    const stepDy = e.clientY - lastPosRef.current.y;

    velocityRef.current = {
      vx: stepDx / dt,
      vy: stepDy / dt,
    };

    lastPosRef.current = { x: e.clientX, y: e.clientY };
    lastTimeRef.current = now;

    // Bounded pan limits
    const maxPanX = 1400;
    const maxPanY = 1800;
    const newX = Math.max(-maxPanX, Math.min(maxPanX, dragStartRef.current.panX + dx));
    const newY = Math.max(-maxPanY, Math.min(maxPanY, dragStartRef.current.panY + dy));

    setPan({ x: newX, y: newY });
  };

  const stopDragging = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !renderedIslandMode) return;
    isDraggingRef.current = false;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    // Apply inertia with requestAnimationFrame decay
    let { vx, vy } = velocityRef.current;
    if (Math.hypot(vx, vy) > 0.08) {
      const decay = 0.94;
      const stepInertia = () => {
        vx *= decay;
        vy *= decay;

        const maxPanX = 1400;
        const maxPanY = 1800;
        const nextX = Math.max(-maxPanX, Math.min(maxPanX, panRef.current.x + vx * 16));
        const nextY = Math.max(-maxPanY, Math.min(maxPanY, panRef.current.y + vy * 16));

        setPan({ x: nextX, y: nextY });

        if (Math.hypot(vx, vy) > 0.04) {
          inertiaRafRef.current = requestAnimationFrame(stepInertia);
        } else {
          inertiaRafRef.current = null;
        }
      };

      inertiaRafRef.current = requestAnimationFrame(stepInertia);
    }

    // Reset suppress click flag after click event cycle ends
    setTimeout(() => {
      suppressClickRef.current = false;
    }, 60);
  };

  const handleCardAnchorClick = useCallback(
    (item: UnifiedSearchResult) => {
      if (suppressClickRef.current) return;
      onAnchor(item);
    },
    [onAnchor],
  );

  return (
    <div className="relative w-full min-h-[calc(100vh-5rem)]">
      {/* Centered Cosmos Loading Spinner during transition */}
      {isTransitioning && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <CosmosSpinner size={48} />
          <span className="text-[13px] text-neutral-300 font-medium tracking-wide mt-4">
            {isIslandMode ? "Entering Cosmos Canvas..." : "Restoring Wall..."}
          </span>
        </div>
      )}

      {/* Mode View: Pannable Canvas (Island) vs Dense Masonry (Flat) */}
      {renderedIslandMode ? (
        /* ISLAND MODE: Pannable 2D Canvas */
        <div
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDragging}
          onPointerCancel={stopDragging}
          className={cn(
            "fixed inset-0 top-0 overflow-hidden select-none cursor-grab active:cursor-grabbing z-0",
            "transition-opacity duration-300 ease-out",
            isTransitioning ? "opacity-0 pointer-events-none" : "opacity-100",
          )}
        >
          {/* Subtle canvas pan hint */}
          <div className="fixed bottom-6 right-6 z-20 pointer-events-none hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-neutral-400 text-[11px]">
            <span>Drag canvas to explore</span>
            <button
              type="button"
              onClick={() => setPan({ x: 0, y: 0 })}
              className="pointer-events-auto text-brand hover:underline cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Canvas content translated in 2D space */}
          <div
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
              willChange: "transform",
            }}
            className="w-[2400px] sm:w-[3200px] pt-28 pb-32 px-12 grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2.5 sm:gap-3"
          >
            {items.map((item) => {
              const isAnchored = anchoredItem?.externalId === item.externalId;
              const hasActiveAnchor = Boolean(anchoredItem);
              const isDimmed = hasActiveAnchor && !isAnchored;
              const tracked = trackedMap[item.externalId]?.status ?? null;

              return (
                <div key={`island-${item.externalId}`} className="w-full">
                  <PosterCard
                    item={item}
                    isAnchored={isAnchored}
                    isDimmed={isDimmed}
                    trackedStatus={tracked}
                    onAnchor={handleCardAnchorClick}
                    onStatusChange={onStatusChange}
                    onRemoveTracked={onRemoveTracked}
                    dense={true}
                  />
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* FLAT MODE: Dense Masonry / Grid with ~12px gaps */
        <div
          className={cn(
            "w-full px-4 sm:px-6 md:px-8 lg:px-12 pt-6 pb-28 sm:pb-24 transition-opacity duration-300 ease-out",
            isTransitioning ? "opacity-0" : "opacity-100",
          )}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
            {items.map((item) => {
              const isAnchored = anchoredItem?.externalId === item.externalId;
              const hasActiveAnchor = Boolean(anchoredItem);
              const isDimmed = hasActiveAnchor && !isAnchored;
              const tracked = trackedMap[item.externalId]?.status ?? null;

              return (
                <PosterCard
                  key={`flat-${item.externalId}`}
                  item={item}
                  isAnchored={isAnchored}
                  isDimmed={isDimmed}
                  trackedStatus={tracked}
                  onAnchor={handleCardAnchorClick}
                  onStatusChange={onStatusChange}
                  onRemoveTracked={onRemoveTracked}
                  dense={false}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
