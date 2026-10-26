"use client";

import { Bookmark, Check, Film, Gamepad2, Play, Tv } from "lucide-react";
import Link from "next/link";
import type { CalendarItem } from "@/app/api/calendar/route";
import type { MediaStatus } from "@/components/media-card";
import { PosterImage } from "@/components/poster-image";

interface CalendarRowProps {
  item: CalendarItem;
  todayYmd: string;
  myStatus?: MediaStatus | null;
  onStatusChange: (status: "want_to" | "doing" | "done") => void;
  isMutating?: boolean;
}

function getStatusDetails(status: MediaStatus, mediaType: "movie" | "tv" | "game") {
  switch (status) {
    case "want_to":
      return {
        label: "In your queue",
        colorClass: "bg-status-queue",
        textClass: "text-status-queue",
      };
    case "doing":
      return {
        label: mediaType === "game" ? "Currently playing" : "Currently watching",
        colorClass: "bg-status-doing",
        textClass: "text-status-doing",
      };
    case "done":
      return {
        label: "Completed",
        colorClass: "bg-status-done",
        textClass: "text-status-done",
      };
    case "dropped":
      return {
        label: "Dropped",
        colorClass: "bg-status-dropped",
        textClass: "text-status-dropped",
      };
  }
}

function getMediaDetailUrl(externalId: string, mediaType: string) {
  const parts = externalId.split(":");
  const rawId = parts[parts.length - 1];
  return `/media/${mediaType}/${rawId}`;
}

export function CalendarRow({
  item,
  todayYmd,
  myStatus,
  onStatusChange,
  isMutating = false,
}: CalendarRowProps) {
  const isFuture = item.releaseDate ? item.releaseDate > todayYmd : true;
  const isPast = item.releaseDate ? item.releaseDate < todayYmd : false;

  const detailUrl = getMediaDetailUrl(item.externalId, item.mediaType);
  const statusInfo = myStatus ? getStatusDetails(myStatus, item.mediaType) : null;

  const TypeIcon = item.mediaType === "tv" ? Tv : item.mediaType === "game" ? Gamepad2 : Film;
  const genresStr = item.genres.slice(0, 3).join(", ");

  return (
    <div
      className={`group relative flex items-start gap-3.5 p-3 rounded-2xl border border-border bg-card/60 hover:bg-card hover:border-foreground/20 transition-all shadow-2xs ${
        isPast ? "opacity-75 hover:opacity-100" : ""
      }`}
    >
      {/* Poster */}
      <Link
        href={detailUrl}
        className="relative w-14 aspect-2/3 rounded-xl overflow-hidden bg-muted border border-border shrink-0 group-hover:shadow-xs transition"
        tabIndex={-1}
        aria-hidden="true"
      >
        <PosterImage
          src={item.posterUrl}
          title={item.title}
          mediaType={item.mediaType}
          sizes="60px"
          className="object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </Link>

      {/* Main info */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Title */}
        <div className="flex items-start justify-between gap-2">
          <Link
            href={detailUrl}
            className="text-sm font-semibold tracking-tight text-foreground hover:underline truncate"
          >
            {item.title}
          </Link>
        </div>

        {/* Muted meta line */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
          <span className="inline-flex items-center gap-1 shrink-0">
            <TypeIcon className="size-3.5 text-muted-foreground/80" />
            <span className="capitalize">
              {item.mediaType === "tv" ? "TV series" : item.mediaType}
            </span>
          </span>
          {item.releaseYear && (
            <>
              <span>•</span>
              <span>{item.releaseYear}</span>
            </>
          )}
          {genresStr && (
            <>
              <span>•</span>
              <span className="truncate max-w-56">{genresStr}</span>
            </>
          )}
        </div>

        {/* Status dot + verb if in library */}
        {statusInfo && (
          <div className="flex items-center gap-1.5 text-xs font-medium pt-0.5">
            <span className={`size-2 rounded-full shrink-0 ${statusInfo.colorClass}`} />
            <span className={statusInfo.textClass}>{statusInfo.label}</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1 self-center">
        {/* Future releases: Queue only */}
        {isFuture ? (
          <button
            type="button"
            title="Add to Queue"
            disabled={isMutating}
            onClick={() => onStatusChange("want_to")}
            className={`p-2 rounded-xl border transition cursor-pointer disabled:opacity-40 shadow-2xs ${
              myStatus === "want_to"
                ? "bg-status-queue/15 text-status-queue border-status-queue/40 font-semibold"
                : "bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border"
            }`}
          >
            <Bookmark className="size-4" />
          </button>
        ) : (
          /* Released titles: Queue, Active, Done */
          <div className="flex items-center gap-1 bg-background/80 p-0.5 rounded-xl border border-border">
            <button
              type="button"
              title="Add to Queue"
              disabled={isMutating}
              onClick={() => onStatusChange("want_to")}
              className={`p-1.5 rounded-lg transition cursor-pointer disabled:opacity-40 ${
                myStatus === "want_to"
                  ? "bg-status-queue/20 text-status-queue font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Bookmark className="size-3.5" />
            </button>
            <button
              type="button"
              title="In Progress"
              disabled={isMutating}
              onClick={() => onStatusChange("doing")}
              className={`p-1.5 rounded-lg transition cursor-pointer disabled:opacity-40 ${
                myStatus === "doing"
                  ? "bg-status-doing/20 text-status-doing font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Play className="size-3.5" />
            </button>
            <button
              type="button"
              title="Completed"
              disabled={isMutating}
              onClick={() => onStatusChange("done")}
              className={`p-1.5 rounded-lg transition cursor-pointer disabled:opacity-40 ${
                myStatus === "done"
                  ? "bg-status-done/20 text-status-done font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Check className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
