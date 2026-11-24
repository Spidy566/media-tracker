"use client";

import Image from "next/image";
import { usePosters } from "@/components/providers/poster-provider";
import type { WatchProviderItem, WatchProvidersGroup } from "@/types/media-details";

interface WatchProvidersSectionProps {
  watchProviders: WatchProvidersGroup | null | undefined;
  className?: string;
}

function ProviderGroup({
  title,
  providers,
  hidePosters,
}: {
  title: string;
  providers: WatchProviderItem[];
  hidePosters: boolean;
}) {
  if (providers.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
        {title}
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {providers.map((p) => {
          if (hidePosters) {
            return (
              <span
                key={`${title}-${p.id}`}
                className="px-2.5 py-1 rounded-lg bg-muted border border-border text-xs text-foreground font-medium shadow-2xs"
              >
                {p.name}
              </span>
            );
          }

          return (
            <div
              key={`${title}-${p.id}`}
              title={p.name}
              className="relative size-8 sm:size-9 rounded-lg overflow-hidden bg-muted border border-border shadow-2xs shrink-0 transition-transform hover:scale-105"
            >
              <Image src={p.logoPath} alt={p.name} fill sizes="36px" className="object-cover" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WatchProvidersSection({ watchProviders, className }: WatchProvidersSectionProps) {
  const { hidePosters } = usePosters();

  if (!watchProviders) return null;

  const { stream, rent, buy, attribution } = watchProviders;
  const hasAny = stream.length > 0 || rent.length > 0 || buy.length > 0;

  if (!hasAny) return null;

  return (
    <div
      className={`space-y-3 bg-card border border-border rounded-2xl p-4 shadow-sm ${className || ""}`.trim()}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-foreground">
          Where to watch
        </h3>
        <span className="text-[10px] text-muted-foreground font-medium">JustWatch</span>
      </div>

      <div className="space-y-2.5">
        <ProviderGroup title="Stream" providers={stream} hidePosters={hidePosters} />
        <ProviderGroup title="Rent" providers={rent} hidePosters={hidePosters} />
        <ProviderGroup title="Buy" providers={buy} hidePosters={hidePosters} />
      </div>

      {attribution && (
        <p className="text-[10px] text-muted-foreground/70 pt-1.5 border-t border-border/50 truncate">
          {attribution}
        </p>
      )}
    </div>
  );
}
