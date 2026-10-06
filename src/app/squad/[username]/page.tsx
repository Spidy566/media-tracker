import { desc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { db } from "@/lib/db";
import { SquadClient } from "./squad-client";

export default async function SquadMemberPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  // 1. Fetch user directly from Postgres
  const [member] = await db.select().from(users).where(eq(users.username, username)).limit(1);

  if (!member) {
    notFound();
  }

  // 2. Fetch their entries directly from Postgres
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
    <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Hero Header (Zero loading spinners! Rendered instantly by the server) */}
      <div className="p-6 sm:p-8 rounded-3xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-2xl shadow-md shrink-0">
            {member.displayName[0]}
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {member.displayName}
            </h1>
            <p className="text-xs font-mono text-muted-foreground mt-0.5">@{username}</p>
          </div>
        </div>

        <div className="flex items-center gap-5 bg-muted/40 border border-border p-3 px-6 rounded-2xl shrink-0">
          <div>
            <span className="text-2xl font-black text-foreground">{completedCount}</span>
            <span className="text-xs font-semibold text-muted-foreground block">Completed</span>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <span className="text-2xl font-black text-emerald-500">{activeCount}</span>
            <span className="text-xs font-semibold text-muted-foreground block">Active</span>
          </div>
          <div className="w-px h-7 bg-border" />
          <div>
            <span className="text-2xl font-black text-amber-500">{queueCount}</span>
            <span className="text-xs font-semibold text-muted-foreground block">In Queue</span>
          </div>
        </div>
      </div>

      {/* Interactive Tabs and Grid */}
      <SquadClient entries={serializedEntries} />
    </main>
  );
}
