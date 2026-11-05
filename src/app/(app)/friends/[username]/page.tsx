import { desc, eq } from "drizzle-orm";
import { ArrowLeft, Lock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { SquadClient } from "./squad-client";

export default async function FriendProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const currentUser = await getCurrentUser();

  // 1. Fetch user directly from Postgres
  const [member] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (!member) {
    notFound();
  }

  const isOwner = currentUser?.id === member.id;
  const isPrivate = !member.isPublic && !isOwner;

  // 2. Privacy check: Respect private profiles
  if (isPrivate) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8 flex-1 w-full">
        <div>
          <Link
            href="/friends"
            className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Friends</span>
          </Link>
        </div>

        {/* Profile Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs flex items-center gap-5">
          <div className="size-16 rounded-2xl bg-muted border border-border text-foreground flex items-center justify-center font-semibold text-2xl shadow-xs shrink-0">
            {member.displayName[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                {member.displayName}
              </h1>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground border border-border flex items-center gap-1">
                <Lock className="size-3" />
                <span>Private</span>
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">@{username}</p>
          </div>
        </div>

        {/* Private State Banner */}
        <div className="p-16 rounded-3xl bg-card/60 border border-border text-center flex flex-col items-center justify-center gap-3">
          <div className="size-12 rounded-2xl bg-muted border border-border flex items-center justify-center text-muted-foreground shadow-xs">
            <Lock className="size-5" />
          </div>
          <h2 className="text-base font-semibold text-foreground">This profile is private</h2>
          <p className="text-xs text-muted-foreground max-w-sm">
            @{username} has chosen to keep their Library and tracking activity private.
          </p>
        </div>
      </main>
    );
  }

  // 3. Fetch their entries directly from Postgres
  const entries = await db
    .select({
      id: userMediaEntries.id,
      status: userMediaEntries.status,
      rating: userMediaEntries.rating,
      reviewNote: userMediaEntries.reviewNote,
      updatedAt: userMediaEntries.updatedAt,
      user: {
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      },
      media: {
        id: mediaItems.id,
        externalId: mediaItems.externalId,
        mediaType: mediaItems.mediaType,
        title: mediaItems.title,
        releaseYear: mediaItems.releaseYear,
        posterUrl: mediaItems.posterUrl,
        creator: mediaItems.creator,
        genres: mediaItems.genres,
      },
    })
    .from(userMediaEntries)
    .innerJoin(users, eq(userMediaEntries.userId, users.id))
    .innerJoin(mediaItems, eq(userMediaEntries.mediaItemId, mediaItems.id))
    .where(eq(users.username, username))
    .orderBy(desc(userMediaEntries.updatedAt));

  // Serialize Date objects to ISO strings to match the Entry type
  const serializedEntries = entries.map((e) => ({
    ...e,
    updatedAt: e.updatedAt.toISOString(),
  }));

  const completedCount = serializedEntries.filter((e) => e.status === "done").length;
  const activeCount = serializedEntries.filter((e) => e.status === "doing").length;
  const queueCount = serializedEntries.filter((e) => e.status === "want_to").length;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8 flex-1 w-full">
      <div>
        <Link
          href="/friends"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="size-3.5" />
          <span>Back to Friends</span>
        </Link>
      </div>

      {/* Hero Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="size-16 rounded-2xl bg-muted border border-border text-foreground flex items-center justify-center font-semibold text-2xl shadow-xs shrink-0">
            {member.displayName[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
                {member.displayName}
              </h1>
              {isOwner && (
                <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-brand/15 text-brand border border-brand/20">
                  You
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">@{username}</p>
          </div>
        </div>

        <div className="flex items-center gap-5 bg-muted/40 border border-border p-3 px-6 rounded-2xl shrink-0">
          <div>
            <span className="text-2xl font-semibold text-status-done font-mono tabular-nums">
              {completedCount}
            </span>
            <span className="text-xs font-semibold text-muted-foreground block">Completed</span>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <span className="text-2xl font-semibold text-status-doing font-mono tabular-nums">
              {activeCount}
            </span>
            <span className="text-xs font-semibold text-muted-foreground block">Active</span>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <span className="text-2xl font-semibold text-status-queue font-mono tabular-nums">
              {queueCount}
            </span>
            <span className="text-xs font-semibold text-muted-foreground block">In Queue</span>
          </div>
        </div>
      </div>

      {/* Interactive Tabs and Grid */}
      <SquadClient entries={serializedEntries} />
    </main>
  );
}
