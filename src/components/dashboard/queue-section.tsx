"use client";

import { Bookmark, Dices } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MediaCard, type MediaStatus } from "@/components/media-card";
import { ScrollRow } from "@/components/scroll-row";
import { getMediaHref } from "@/lib/utils";
import type { Entry } from "@/types/entry";

interface QueueSectionProps {
  queueItems: Entry[];
  onQuickStatus: (media: Entry["media"], status: MediaStatus) => void;
  onOpenRoulette: () => void;
}

export function QueueSection({ queueItems, onQuickStatus, onOpenRoulette }: QueueSectionProps) {
  const router = useRouter();

  if (queueItems.length === 0) {
    return (
      <section aria-label="Up Next in Queue">
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5 font-sans">
            <Bookmark className="size-4.5 text-status-queue fill-status-queue/20" />
            <span>Up Next in Queue</span>
          </h2>
        </div>
        <div className="p-8 rounded-2xl bg-card border border-dashed border-border flex flex-col items-center justify-center text-center gap-2">
          <Bookmark className="size-6 text-muted-foreground/60" />
          <p className="text-sm font-semibold text-foreground">Your Queue is empty</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Explore trending titles below or use{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground border border-border">
              ⌘K
            </kbd>{" "}
            to save titles you want to watch or play.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Up Next in Queue">
      <ScrollRow
        title={
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground flex items-center gap-2.5 font-sans">
            <Bookmark className="size-4.5 text-status-queue fill-status-queue/20" />
            <span>Up Next in Queue</span>
            <span className="text-sm font-normal text-muted-foreground font-mono tabular-nums">
              ({queueItems.length})
            </span>
          </h2>
        }
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenRoulette}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-card hover:bg-muted border border-border text-foreground text-xs font-semibold transition cursor-pointer shadow-2xs hover:border-border/80"
            >
              <Dices className="size-3.5 text-brand" />
              <span>Roll Queue</span>
            </button>
            <Link
              href="/library?status=want_to"
              className="text-[13px] font-medium text-muted-foreground hover:text-foreground transition flex items-center gap-1"
            >
              <span>View all</span>
              <span className="text-muted-foreground">&rarr;</span>
            </Link>
          </div>
        }
      >
        {queueItems.map((entry) => (
          <div key={entry.id} className="w-40 sm:w-48 shrink-0 snap-start select-none">
            <MediaCard
              title={entry.media.title}
              mediaType={entry.media.mediaType}
              posterUrl={entry.media.posterUrl}
              releaseYear={entry.media.releaseYear}
              currentStatus={entry.status}
              href={getMediaHref(entry.media)}
              allowedStatuses={["doing", "done"]}
              onQuickStatus={(status) => onQuickStatus(entry.media, status)}
            />
          </div>
        ))}
      </ScrollRow>
    </section>
  );
}
