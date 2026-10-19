"use client";

import Image from "next/image";
import { usePosters } from "@/components/providers/poster-provider";
import type { WatchProviderItem, WatchProvidersGroup } from "@/types/media-details";

interface WatchProvidersSectionProps {
  watchProviders: WatchProvidersGroup | null | undefined;
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
    <div className="space-y-2">
      <span className="text-xs font-medium text-muted-foreground block">{title}</span>
      <div className="flex flex-wrap items-center gap-2">
        {providers.map((p) => {
          if (hidePosters) {
            return (
              <span
                key={`${title}-${p.id}`}
                className="px-2.5 py-1 rounded-lg bg-card border border-border text-xs text-foreground font-medium shadow-2xs"
              >
                {p.name}
              </span>
            );
          }

          return (
            <div
              key={`${title}-${p.id}`}
              title={p.name}
              className="relative size-10 rounded-xl overflow-hidden bg-card border border-border shadow-2xs shrink-0 group/provider"
            >
              <Image src={p.logoPath} alt={p.name} fill sizes="40px" className="object-cover" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WatchProvidersSection({ watchProviders }: WatchProvidersSectionProps) {
  const { hidePosters } = usePosters();

  if (!watchProviders) return null;

  const { stream, rent, buy, attribution } = watchProviders;
  const hasAny = stream.length > 0 || rent.length > 0 || buy.length > 0;

  if (!hasAny) return null;

  return (
    <div className="space-y-3.5 bg-card border border-border rounded-2xl p-5 shadow-2xs">
      <h3 className="text-xs font-semibold text-foreground">Where to watch</h3>

      <div className="space-y-3">
        <ProviderGroup title="Stream" providers={stream} hidePosters={hidePosters} />
        <ProviderGroup title="Rent" providers={rent} hidePosters={hidePosters} />
        <ProviderGroup title="Buy" providers={buy} hidePosters={hidePosters} />
      </div>

      {attribution && (
        <p className="text-[11px] text-muted-foreground/80 pt-1 border-t border-border/60">
          {attribution}
        </p>
      )}
    </div>
  );
}
