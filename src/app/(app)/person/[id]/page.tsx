import { eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/app/(app)/media/[type]/[id]/back-button";
import { MediaCard } from "@/components/media-card";
import { ScrollRow } from "@/components/scroll-row";
import { mediaItems, userMediaEntries, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPersonDetails } from "@/lib/person-details";
import { HIDE_POSTERS_COOKIE } from "@/lib/poster-cookie";
import { BiographyToggle } from "./biography-toggle";
import { Filmography } from "./filmography";

// --- Helpers ---

function computeAge(birthday: string, deathday?: string | null): string {
  const birth = new Date(birthday);
  const end = deathday ? new Date(deathday) : new Date();
  let age = end.getFullYear() - birth.getFullYear();
  const m = end.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < birth.getDate())) age--;
  if (deathday) {
    return `${age} (died)`;
  }
  return `${age} years old`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

// --- Metadata ---

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  if (!/^\d+$/.test(id)) return { title: "Person not found" };

  const person = await getPersonDetails(Number(id));
  if (!person) return { title: "Person not found" };

  return {
    title: `${person.name} — Tracklist`,
    description: person.biography
      ? person.biography.slice(0, 160)
      : `${person.name}'s filmography on Tracklist`,
  };
}

// --- Page ---

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!/^\d+$/.test(id)) notFound();

  const [person, currentUser] = await Promise.all([getPersonDetails(Number(id)), getCurrentUser()]);

  if (!person) notFound();

  // Stealth mode check
  const cookieStore = await cookies();
  const savedPosters = cookieStore.get(HIDE_POSTERS_COOKIE)?.value;
  const hidePosters = savedPosters
    ? savedPosters === "1"
    : process.env.NEXT_PUBLIC_STEALTH_MODE === "true";

  // --- Squad overlap ---
  // Collect all externalIds from the person's credits
  const allExternalIds = new Set<string>();
  for (const c of person.castCredits) allExternalIds.add(c.externalId);
  for (const g of person.crewGroups) {
    for (const c of g.credits) allExternalIds.add(c.externalId);
  }

  const statusMap: Record<string, string> = {};
  const squadSummary: { you: number; squad: Array<{ name: string; count: number }> } = {
    you: 0,
    squad: [],
  };

  if (allExternalIds.size > 0) {
    try {
      const externalIdArray = [...allExternalIds];
      const matchedMedia = await db
        .select({
          externalId: mediaItems.externalId,
          mediaItemId: mediaItems.id,
        })
        .from(mediaItems)
        .where(inArray(mediaItems.externalId, externalIdArray));

      if (matchedMedia.length > 0) {
        const mediaIdToExternalId = new Map<string, string>();
        for (const m of matchedMedia) mediaIdToExternalId.set(m.mediaItemId, m.externalId);

        const entries = await db
          .select({
            mediaItemId: userMediaEntries.mediaItemId,
            userId: userMediaEntries.userId,
            status: userMediaEntries.status,
            username: users.username,
            displayName: users.displayName,
          })
          .from(userMediaEntries)
          .innerJoin(users, eq(userMediaEntries.userId, users.id))
          .where(
            inArray(
              userMediaEntries.mediaItemId,
              matchedMedia.map((m) => m.mediaItemId),
            ),
          );

        // Build status map and count distinct titles per user
        const userLoggedTitles = new Map<string, { name: string; titles: Set<string> }>();
        for (const e of entries) {
          const extId = mediaIdToExternalId.get(e.mediaItemId);
          if (!extId) continue;

          if (currentUser && e.userId === currentUser.id) {
            statusMap[extId] = e.status;
          }

          if (!userLoggedTitles.has(e.userId)) {
            userLoggedTitles.set(e.userId, { name: e.displayName, titles: new Set() });
          }
          userLoggedTitles.get(e.userId)?.titles.add(extId);
        }

        if (currentUser && userLoggedTitles.has(currentUser.id)) {
          squadSummary.you = userLoggedTitles.get(currentUser.id)?.titles.size ?? 0;
        }

        // Squad summary (exclude current user)
        for (const [uid, data] of userLoggedTitles) {
          if (currentUser && uid === currentUser.id) continue;
          squadSummary.squad.push({ name: data.name, count: data.titles.size });
        }
      }
    } catch (err) {
      console.warn("Failed to fetch squad overlap for person:", err);
    }
  }

  const profileUrl = person.profilePath
    ? `https://image.tmdb.org/t/p/h632${person.profilePath}`
    : null;
  const initials = getInitials(person.name);

  // Age / lifespan
  let ageStr: string | null = null;
  if (person.birthday) {
    ageStr = computeAge(person.birthday, person.deathday);
  }

  // Meta line parts
  const metaParts: string[] = [];
  if (person.knownForDepartment) metaParts.push(person.knownForDepartment);
  if (ageStr) metaParts.push(ageStr);
  if (person.placeOfBirth) metaParts.push(person.placeOfBirth);

  // Squad summary line
  const hasSelfCount = Boolean(currentUser && squadSummary.you > 0);
  const hasSquadCounts = squadSummary.squad.some((s) => s.count > 0);
  const showSquadLine = hasSelfCount || hasSquadCounts;

  const totalCredits =
    person.castCredits.length + person.crewGroups.reduce((acc, g) => acc + g.credits.length, 0);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      {/* Compact header bar with back button */}
      <div className="h-16 sm:h-20 bg-muted/30 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-full flex items-center">
          <BackButton />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-8 space-y-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Portrait */}
          <div className="relative size-28 sm:size-36 rounded-2xl overflow-hidden bg-muted border border-border shadow-lg shrink-0">
            {!hidePosters && profileUrl ? (
              <Image
                src={profileUrl}
                alt={person.name}
                fill
                sizes="144px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground font-semibold text-2xl">
                {initials}
              </div>
            )}
          </div>

          {/* Name & Meta */}
          <div className="flex-1 min-w-0 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground tracking-tight">
              {person.name}
            </h1>

            {metaParts.length > 0 && (
              <p className="text-sm text-muted-foreground">{metaParts.join(" · ")}</p>
            )}

            {person.biography && <BiographyToggle text={person.biography} />}
          </div>
        </div>

        {/* Known for */}
        {person.knownFor.length > 0 && (
          <ScrollRow title={<h2 className="text-xs font-semibold text-foreground">Known for</h2>}>
            {person.knownFor.map((credit) => {
              const parts = credit.externalId.split(":");
              const tmdbId = parts[parts.length - 1];
              return (
                <div key={credit.externalId} className="w-36 sm:w-44 shrink-0 snap-start">
                  <Link href={`/media/${credit.mediaType}/${tmdbId}`} className="block group">
                    <MediaCard
                      title={credit.title}
                      mediaType={credit.mediaType}
                      posterUrl={
                        credit.posterPath
                          ? `https://image.tmdb.org/t/p/w780${credit.posterPath}`
                          : null
                      }
                      releaseYear={credit.year}
                      subtitle={credit.character || credit.job || undefined}
                    />
                  </Link>
                </div>
              );
            })}
          </ScrollRow>
        )}

        {/* Squad overlap summary */}
        {showSquadLine && (
          <p className="text-xs text-muted-foreground">
            {hasSelfCount && (
              <>
                You&apos;ve logged{" "}
                <span className="font-semibold text-foreground">{squadSummary.you}</span> of their
                titles
              </>
            )}
            {hasSelfCount && hasSquadCounts && " · "}
            {squadSummary.squad
              .filter((s) => s.count > 0)
              .map((s, i) => (
                <span key={s.name}>
                  {i > 0 && " · "}
                  {s.name} has logged{" "}
                  <span className="font-semibold text-foreground">{s.count}</span>
                </span>
              ))}
          </p>
        )}

        {/* Filmography */}
        {totalCredits > 0 ? (
          <div className="space-y-3">
            <h2 className="text-xs font-semibold text-foreground">Filmography</h2>
            <Filmography
              castCredits={person.castCredits}
              crewGroups={person.crewGroups}
              hiddenCount={person.hiddenCount}
              statusMap={statusMap as Record<string, "want_to" | "doing" | "done" | "dropped">}
              knownForDepartment={person.knownForDepartment}
            />
          </div>
        ) : (
          <div className="text-center py-16 space-y-2">
            <p className="text-sm text-muted-foreground">No credits found for this person.</p>
          </div>
        )}
      </div>
    </div>
  );
}
