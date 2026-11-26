import { Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getStatusBadgeClasses, getStatusLabel } from "@/lib/media-formatters";
import { cn } from "@/lib/utils";
import type { Entry } from "@/types/entry";

interface FriendsActivitySectionProps {
  friendEntries: Entry[];
}

/** Renders friends' status logs, ratings, and review notes for a media title. */
export function FriendsActivitySection({ friendEntries }: FriendsActivitySectionProps) {
  if (friendEntries.length === 0) return null;

  return (
    <div className="space-y-3.5 pt-2">
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Friends&apos; Activity ({friendEntries.length})
        </h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {friendEntries.map((entry) => {
          const formattedDate = entry.updatedAt
            ? new Date(entry.updatedAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : null;

          return (
            <div
              key={entry.id}
              className="p-4 rounded-2xl bg-card border border-border flex flex-col justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/friends/${entry.user.username}`}
                  className="flex items-center gap-2.5 min-w-0 group"
                >
                  {entry.user.avatarUrl ? (
                    <Image
                      src={entry.user.avatarUrl}
                      alt={entry.user.displayName}
                      width={32}
                      height={32}
                      className="size-8 rounded-full object-cover border border-border shrink-0 group-hover:border-foreground/30 transition"
                    />
                  ) : (
                    <div className="size-8 rounded-full bg-muted border border-border text-foreground flex items-center justify-center font-semibold text-xs shrink-0 group-hover:border-foreground/30 transition">
                      {entry.user.displayName[0]?.toUpperCase() || "U"}
                    </div>
                  )}

                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-foreground block truncate group-hover:text-brand transition">
                      {entry.user.displayName}
                    </span>
                    <span className="text-[11px] text-muted-foreground block truncate">
                      @{entry.user.username}
                    </span>
                  </div>
                </Link>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border",
                      getStatusBadgeClasses(entry.status),
                    )}
                  >
                    {getStatusLabel(entry.status)}
                  </span>
                </div>
              </div>

              {(entry.rating || entry.reviewNote) && (
                <div className="space-y-2 pt-2 border-t border-border/60">
                  <div className="flex items-center justify-between gap-2">
                    {entry.rating ? (
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={cn(
                              "size-3",
                              star <= (entry.rating || 0)
                                ? "text-rating fill-rating"
                                : "text-muted/30",
                            )}
                          />
                        ))}
                        <span className="text-xs font-mono font-medium text-muted-foreground ml-1.5 tabular-nums">
                          {entry.rating} / 5
                        </span>
                      </div>
                    ) : (
                      <div />
                    )}

                    {formattedDate && (
                      <span className="text-[10px] text-muted-foreground/70 font-mono">
                        {formattedDate}
                      </span>
                    )}
                  </div>

                  {entry.reviewNote && (
                    <div className="border-l-2 border-brand/40 pl-3 py-0.5">
                      <p className="text-xs text-foreground/90 italic leading-relaxed">
                        &ldquo;{entry.reviewNote}&rdquo;
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
