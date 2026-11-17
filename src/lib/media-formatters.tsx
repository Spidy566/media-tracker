import { Film, Gamepad2, type LucideIcon, Tv } from "lucide-react";

import type { MediaStatus } from "@/db/schema";

export type { MediaStatus };

/**
 * Returns the human-readable display label for a media type.
 */
export function getMediaTypeLabel(type?: string): string {
  switch (type) {
    case "tv":
      return "TV Series";
    case "game":
      return "Game";
    default:
      return "Movie";
  }
}

/**
 * Returns the Lucide icon component corresponding to a media type.
 */
export function getMediaTypeIcon(type?: string): LucideIcon {
  switch (type) {
    case "tv":
      return Tv;
    case "game":
      return Gamepad2;
    default:
      return Film;
  }
}

/**
 * Renders the Lucide icon JSX component for a media type.
 */
export function MediaTypeIcon({
  type,
  className = "size-3",
}: {
  type?: string;
  className?: string;
}) {
  const Icon = getMediaTypeIcon(type);
  return <Icon className={className} />;
}

/**
 * Returns the human-readable label for a media entry status.
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case "doing":
      return "In Progress";
    case "want_to":
      return "In Queue";
    case "done":
      return "Completed";
    case "dropped":
      return "Dropped";
    default:
      return status;
  }
}

/**
 * Returns the Tailwind CSS classes for status pill badges.
 */
export function getStatusBadgeClasses(status: string): string {
  switch (status) {
    case "doing":
      return "bg-status-doing/15 text-status-doing border-status-doing/30";
    case "want_to":
      return "bg-status-queue/15 text-status-queue border-status-queue/30";
    case "done":
      return "bg-status-done/15 text-status-done border-status-done/30";
    case "dropped":
      return "bg-status-dropped/15 text-status-dropped border-status-dropped/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

/**
 * Formats a Date or ISO date string into human-friendly relative time.
 */
export function formatRelativeTime(dateInput: string | Date): string {
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return "Yesterday";
  if (diffInDays < 7) return `${diffInDays}d ago`;
  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) return `${diffInWeeks}w ago`;
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}mo ago`;
  return `${Math.floor(diffInDays / 365)}y ago`;
}
