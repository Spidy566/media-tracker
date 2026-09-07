import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

const createEntrySchema = z.object({
  userId: z.string().uuid(),
  // Factual media info from the search result
  media: z.object({
    externalId: z.string().min(1),
    mediaType: z.enum(["movie", "tv", "game", "book"]),
    title: z.string().min(1),
    releaseYear: z.number().nullable().optional(),
    posterUrl: z.string().nullable().optional(),
    creator: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    genres: z.array(z.string()).optional().default([]),
  }),
  // User's tracking status
  status: z.enum(["want_to", "doing", "done", "dropped"]).default("want_to"),
  rating: z.number().min(1).max(10).nullable().optional(),
  reviewNote: z.string().max(280).nullable().optional(),
});

// POST /api/entries — Track or update an item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createEntrySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { userId, media, status, rating, reviewNote } = parsed.data;

    // 1. Ensure the media item exists in our shared catalog (cache on demand)
    const [savedItem] = await db
      .insert(mediaItems)
      .values({
        externalId: media.externalId,
        mediaType: media.mediaType,
        title: media.title,
        releaseYear: media.releaseYear ?? null,
        posterUrl: media.posterUrl ?? null,
        creator: media.creator ?? null,
        summary: media.summary ?? null,
        genres: media.genres ?? [],
      })
      .onConflictDoUpdate({
        target: mediaItems.externalId,
        set: {
          // Update poster or summary if it was previously null
          posterUrl: media.posterUrl ?? undefined,
          summary: media.summary ?? undefined,
        },
      })
      .returning();

    // 2. Link the user to the media item (or update their current status/rating)
    const [entry] = await db
      .insert(userMediaEntries)
      .values({
        userId,
        mediaItemId: savedItem.id,
        status,
        rating: rating ?? null,
        reviewNote: reviewNote ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userMediaEntries.userId, userMediaEntries.mediaItemId],
        set: {
          status,
          rating: rating ?? null,
          reviewNote: reviewNote ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return NextResponse.json({ success: true, entry, media: savedItem }, { status: 201 });
  } catch (error) {
    console.error("Failed to track media:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// GET /api/entries — Get entries (feed or profile)
// Usage:
//   /api/entries -> All squad activity (recent updates first)
//   /api/entries?userId=... -> Specific friend's stash
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const userId = searchParams.get("userId");

    const query = db
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
      .orderBy(desc(userMediaEntries.updatedAt));

    if (userId) {
      const rows = await query.where(eq(userMediaEntries.userId, userId));
      return NextResponse.json({ entries: rows });
    }

    const rows = await query.limit(30);
    return NextResponse.json({ entries: rows });
  } catch (error) {
    console.error("Failed to fetch entries:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


// DELETE /api/entries?id=...&userId=... — Remove an entry from stash
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id || !userId) {
      return NextResponse.json(
        { error: "Missing required params: id and userId" },
        { status: 400 }
      );
    }

    // Delete only if the entry belongs to this user
    const [deleted] = await db
      .delete(userMediaEntries)
      .where(
        and(
          eq(userMediaEntries.id, id),
          eq(userMediaEntries.userId, userId)
        )
      )
      .returning();

    if (!deleted) {
      return NextResponse.json(
        { error: "Entry not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deleted });
  } catch (error) {
    console.error("Failed to delete entry:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}