"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
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

function CrewAvatar({ profileUrl, name }: { profileUrl: string | null; name: string }) {
  const [imageError, setImageError] = useState(false);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="relative size-9 rounded-full overflow-hidden bg-muted border border-border shrink-0 group-hover/crew:border-foreground/40 transition">
      {profileUrl && !imageError ? (
        <Image
          src={profileUrl}
          alt={name}
          fill
          sizes="36px"
          className="object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground font-semibold text-[10px] select-none">
          {initials}
        </div>
      )}
    </div>
  );
}

function CrewGroup({ label, members }: { label: string; members: CrewMember[] }) {
  const { hidePosters } = usePosters();

  if (members.length === 0) return null;

  return (
    <div className="space-y-2">
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
        {label}
      </span>
      <div className="flex flex-wrap gap-3">
        {members.map((member) => {
          const profileUrl = member.profilePath
            ? `https://image.tmdb.org/t/p/w185${member.profilePath}`
            : null;

          return (
            <Link
              key={`${member.id}-${member.job}`}
              href={`/person/${member.id}`}
              className="flex items-center gap-2.5 group/crew select-none"
            >
              {!hidePosters && <CrewAvatar profileUrl={profileUrl} name={member.name} />}
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-foreground group-hover/crew:text-brand transition truncate">
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

  const hasDirectors = Boolean(directors && directors.length > 0);
  const hasWriters = Boolean(writers && writers.length > 0);
  const hasMusic = musicMembers.length > 0;
  const hasCreators = Boolean(creators && creators.length > 0);

  const hasAnyCrew = hasCreators || hasDirectors || hasWriters || hasMusic;

  if (!hasAnyCrew) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Crew
      </h3>
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
