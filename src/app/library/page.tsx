import { desc, eq } from "drizzle-orm";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { LibraryClient } from "./library-client";
import { LibraryLoggedOutPrompt } from "./logged-out-prompt";

export default async function LibraryPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return (
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Your Library
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Everything you have logged, bookmarked, or completed.
          </p>
        </div>
        <LibraryLoggedOutPrompt />
      </main>
    );
  }

  const rawEntries = await db
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
    .where(eq(userMediaEntries.userId, currentUser.id))
    .orderBy(desc(userMediaEntries.updatedAt));

  const entries = rawEntries.map((e) => ({
    ...e,
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Your Library
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Everything you have logged, bookmarked, or completed.
        </p>
      </div>

      <LibraryClient initialEntries={entries} />
    </main>
  );
}
