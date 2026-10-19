import { eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { MediaStatus } from "@/components/media-card";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { CalendarClient } from "./calendar-client";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const myStatus: Record<string, MediaStatus> = {};
  const squad: Record<string, { name: string; status: MediaStatus }[]> = {};
  // 1. Query all of the current user's entries joined with media_items.externalId
  const userEntries = await db
    .select({
      externalId: mediaItems.externalId,
      status: userMediaEntries.status,
    })
    .from(userMediaEntries)
    .innerJoin(mediaItems, eq(userMediaEntries.mediaItemId, mediaItems.id))
    .where(eq(userMediaEntries.userId, currentUser.id));

  for (const entry of userEntries) {
    myStatus[entry.externalId] = entry.status;
  }

  // 2. Query all other users' entries (externalId, display name, status)
  const otherEntries = await db
    .select({
      externalId: mediaItems.externalId,
      name: users.displayName,
      status: userMediaEntries.status,
    })
    .from(userMediaEntries)
    .innerJoin(mediaItems, eq(userMediaEntries.mediaItemId, mediaItems.id))
    .innerJoin(users, eq(userMediaEntries.userId, users.id))
    .where(ne(userMediaEntries.userId, currentUser.id));

  for (const entry of otherEntries) {
    if (!squad[entry.externalId]) {
      squad[entry.externalId] = [];
    }
    squad[entry.externalId].push({
      name: entry.name,
      status: entry.status,
    });
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <CalendarClient
        currentUser={{
          id: currentUser.id,
          username: currentUser.username,
          displayName: currentUser.displayName,
          avatarUrl: currentUser.avatarUrl,
        }}
        myStatus={myStatus}
        squad={squad}
      />
    </Suspense>
  );
}
