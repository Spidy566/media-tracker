"use client";

import type { UnifiedSearchResult } from "@/app/api/search/route";
import { type MediaStatus, PosterCard } from "@/components/discover/poster-card";

interface PosterWallProps {
  items: UnifiedSearchResult[];
  anchoredItem: UnifiedSearchResult | null;
  trackedMap: Record<string, { id: string; status: MediaStatus }>;
  onAnchor: (item: UnifiedSearchResult) => void;
  onStatusChange: (item: UnifiedSearchResult, status: MediaStatus) => void;
  onRemoveTracked: (item: UnifiedSearchResult) => void;
  children?: React.ReactNode;
}

export function PosterWall({
  items,
  anchoredItem,
  trackedMap,
  onAnchor,
  onStatusChange,
  onRemoveTracked,
  children,
}: PosterWallProps) {
  return (
    <div className="relative w-full min-h-[calc(100vh-5rem)]">
      <div className="w-full px-4 sm:px-6 md:px-8 lg:px-12 pt-6 pb-28 sm:pb-24">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3">
          {items.map((item) => {
            const isAnchored = anchoredItem?.externalId === item.externalId;
            const tracked = trackedMap[item.externalId]?.status ?? null;

            return (
              <PosterCard
                key={`flat-${item.externalId}`}
                item={item}
                isAnchored={isAnchored}
                isDimmed={false}
                trackedStatus={tracked}
                onAnchor={onAnchor}
                onStatusChange={onStatusChange}
                onRemoveTracked={onRemoveTracked}
                dense={false}
              />
            );
          })}
        </div>
        {children}
      </div>
    </div>
  );
}
