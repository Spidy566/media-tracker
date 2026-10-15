"use client";

import Image from "next/image";
import Link from "next/link";
import { usePosters } from "@/components/providers/poster-provider";
import type { CrewMember } from "@/types/media-details";

interface CrewSectionProps {
  directors?: CrewMember[];
  writers?: CrewMember[];
  composer?: CrewMember | null;
  composers?: CrewMember[];
  creators?: CrewMember[];
  mediaType: "movie" | "tv";
}

function CrewGroup({ label, members }: { label: string; members: CrewMember[] }) {
  const { hidePosters } = usePosters();

  if (members.length === 0) return null;

  return (
    <div className="space-y-2">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </span>
      <div className="flex flex-wrap gap-3">
        {members.map((member) => {
          const initials = member.name
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("");
          const profileUrl = member.profilePath
            ? `https://image.tmdb.org/t/p/w185${member.profilePath}`
            : null;

          return (
            <Link
              key={`${member.id}-${member.job}`}
              href={`/person/${member.id}`}
              className="flex items-center gap-2.5 group/crew"
            >
              <div className="relative size-9 rounded-full overflow-hidden bg-muted border border-border shrink-0 group-hover/crew:border-foreground/30 transition">
                {!hidePosters && profileUrl ? (
                  <Image
                    src={profileUrl}
                    alt={member.name}
                    fill
                    sizes="36px"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground font-medium text-[10px]">
                    {initials}
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-foreground group-hover/crew:opacity-80 transition truncate">
                  {member.name}
                </span>
                <span className="text-[11px] text-muted-foreground leading-tight">
                  {member.job}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function CrewSection({
  directors,
  writers,
  composer,
  composers,
  creators,
  mediaType,
}: CrewSectionProps) {
  const musicMembers =
    composers && composers.length > 0 ? composers.slice(0, 3) : composer ? [composer] : [];

  const hasDirectors = directors && directors.length > 0;
  const hasWriters = writers && writers.length > 0;
  const hasMusic = musicMembers.length > 0;
  const hasCreators = creators && creators.length > 0;

  const hasAnyCrew = hasCreators || hasDirectors || hasWriters || hasMusic;

  if (!hasAnyCrew) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-foreground">Crew</h3>
      <div className="space-y-4">
        {mediaType === "tv" && creators && creators.length > 0 && (
          <CrewGroup label="Created by" members={creators} />
        )}
        {directors && directors.length > 0 && <CrewGroup label="Directed by" members={directors} />}
        {writers && writers.length > 0 && <CrewGroup label="Written by" members={writers} />}
        {hasMusic && <CrewGroup label="Music" members={musicMembers} />}
      </div>
    </div>
  );
}
