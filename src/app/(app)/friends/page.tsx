import { asc, desc, eq, inArray, or } from "drizzle-orm";
import { ArrowRight, Bookmark, Check, Film, Gamepad2, Lock, Play, Tv, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PosterImage } from "@/components/poster-image";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getMediaHref } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Friends — Tracklist",
  description: "Browse members, their stats, and what public friends are watching or playing.",
};

export default async function FriendsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  // 1. Query public users OR current user
  const directoryUsers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      isPublic: users.isPublic,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(or(eq(users.isPublic, true), eq(users.id, currentUser.id)))
    .orderBy(asc(users.displayName));

  const userIds = directoryUsers.map((u) => u.id);

  // 2. Query all entries for these users in one batch
  type UserEntryRow = {
    userId: string;
    status: "want_to" | "doing" | "done" | "dropped";
    rating: number | null;
    updatedAt: Date;
    title: string;
    mediaType: "movie" | "tv" | "game";
    posterUrl: string | null;
    externalId: string;
  };

  let allEntries: UserEntryRow[] = [];
  if (userIds.length > 0) {
    allEntries = await db
      .select({
        userId: userMediaEntries.userId,
        status: userMediaEntries.status,
        rating: userMediaEntries.rating,
        updatedAt: userMediaEntries.updatedAt,
        title: mediaItems.title,
        mediaType: mediaItems.mediaType,
        posterUrl: mediaItems.posterUrl,
        externalId: mediaItems.externalId,
      })
      .from(userMediaEntries)
      .innerJoin(mediaItems, eq(userMediaEntries.mediaItemId, mediaItems.id))
      .where(inArray(userMediaEntries.userId, userIds))
      .orderBy(desc(userMediaEntries.updatedAt));
  }

  // 3. Aggregate stats and activities by userId
  const memberData = directoryUsers.map((member) => {
    const entries = allEntries.filter((e) => e.userId === member.id);
    const completedCount = entries.filter((e) => e.status === "done").length;
    const doingCount = entries.filter((e) => e.status === "doing").length;
    const queueCount = entries.filter((e) => e.status === "want_to").length;

    const currentDoing = entries.filter((e) => e.status === "doing").slice(0, 2);
    const recentDone = entries.filter((e) => e.status === "done").slice(0, 3);

    return {
      ...member,
      isCurrentUser: member.id === currentUser.id,
      stats: {
        completed: completedCount,
        doing: doingCount,
        queue: queueCount,
      },
      currentDoing,
      recentDone,
    };
  });

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 py-8 space-y-8 flex-1 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
            Friends
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            See what public members are currently watching, playing, and completing.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-card border border-border px-3.5 py-1.5 rounded-xl shrink-0 self-start sm:self-auto">
          <Users className="size-3.5 text-brand" />
          <span>
            {memberData.length} {memberData.length === 1 ? "member" : "members"}
          </span>
        </div>
      </div>

      {/* Friends Cards Grid */}
      {memberData.length === 0 ? (
        <div className="p-16 rounded-3xl bg-card border border-border text-center flex flex-col items-center justify-center gap-3">
          <Users className="size-8 text-muted-foreground" />
          <p className="text-base font-semibold text-foreground">No public profiles yet</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            When friends enable their public profile in Settings, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {memberData.map((member) => (
            <div
              key={member.id}
              className="p-5 sm:p-6 rounded-2xl bg-card border border-border hover:border-border/80 transition shadow-xs flex flex-col justify-between gap-5 group"
            >
              {/* Member Header */}
              <div className="flex items-start justify-between gap-3">
                <Link
                  href={`/friends/${member.username}`}
                  className="flex items-center gap-3.5 min-w-0 group-hover:opacity-90 transition"
                >
                  <div className="size-12 rounded-xl bg-muted border border-border text-foreground flex items-center justify-center font-semibold text-lg shrink-0 shadow-2xs">
                    {member.displayName[0]?.toUpperCase() || "U"}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm truncate">
                        {member.displayName}
                      </span>
                      {member.isCurrentUser && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand/15 text-brand border border-brand/20">
                          You
                        </span>
                      )}
                      {!member.isPublic && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border flex items-center gap-1">
                          <Lock className="size-2.5" />
                          <span>Private</span>
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground block truncate">
                      @{member.username}
                    </span>
                  </div>
                </Link>

                <Link
                  href={`/friends/${member.username}`}
                  className="size-8 rounded-xl border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition shrink-0 cursor-pointer"
                  title={`View @${member.username}'s profile`}
                  aria-label={`View @${member.username}'s profile`}
                >
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>

              {/* Stats Bar */}
              <div className="grid grid-cols-3 gap-2 bg-muted/40 border border-border p-2.5 rounded-xl text-center">
                <div>
                  <span className="text-sm font-semibold text-status-done font-mono tabular-nums block">
                    {member.stats.completed}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1 mt-0.5">
                    <Check className="size-2.5 text-status-done" />
                    <span>Done</span>
                  </span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-status-doing font-mono tabular-nums block">
                    {member.stats.doing}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1 mt-0.5">
                    <Play className="size-2.5 text-status-doing fill-current stroke-0" />
                    <span>Doing</span>
                  </span>
                </div>
                <div>
                  <span className="text-sm font-semibold text-status-queue font-mono tabular-nums block">
                    {member.stats.queue}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium flex items-center justify-center gap-1 mt-0.5">
                    <Bookmark className="size-2.5 text-status-queue" />
                    <span>Queue</span>
                  </span>
                </div>
              </div>

              {/* Currently Watching / Playing Activity */}
              <div className="space-y-2 pt-1 border-t border-border/60">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  Currently Active
                </span>
                {member.currentDoing.length > 0 ? (
                  <div className="space-y-2">
                    {member.currentDoing.map((item) => (
                      <Link
                        key={item.externalId}
                        href={getMediaHref(item)}
                        className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/30 hover:bg-muted/60 border border-border/50 transition group/item"
                      >
                        <div className="relative w-8 aspect-2/3 rounded-md overflow-hidden bg-muted shrink-0 border border-border/50">
                          <PosterImage
                            src={item.posterUrl}
                            title={item.title}
                            mediaType={item.mediaType}
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium text-foreground truncate block group-hover/item:text-brand transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[11px] text-status-doing flex items-center gap-1 capitalize font-medium">
                            {item.mediaType === "movie" ? (
                              <Film className="size-2.5" />
                            ) : item.mediaType === "tv" ? (
                              <Tv className="size-2.5" />
                            ) : (
                              <Gamepad2 className="size-2.5" />
                            )}
                            <span>In Progress</span>
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic py-1">
                    No active titles right now
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
