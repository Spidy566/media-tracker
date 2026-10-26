import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import type { MediaStatus } from "@/components/media-card";
import { mediaItems, userMediaEntries } from "@/db/schema";
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
      />
    </Suspense>
  );
}
