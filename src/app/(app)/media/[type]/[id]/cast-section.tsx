"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { usePosters } from "@/components/providers/poster-provider";
import { ScrollRow } from "@/components/scroll-row";
import type { CastMember } from "@/types/media-details";

interface CastSectionProps {
  cast: CastMember[] | undefined | null;
}

function CastAvatar({ profileUrl, name }: { profileUrl: string | null; name: string }) {
  const [imageError, setImageError] = useState(false);
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="relative size-14 rounded-full overflow-hidden bg-muted border border-border shadow-2xs group-hover/cast:border-foreground/40 transition">
      {profileUrl && !imageError ? (
        <Image
          src={profileUrl}
          alt={name}
          fill
          sizes="56px"
          className="object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground font-semibold text-xs select-none">
          {initials}
        </div>
      )}
    </div>
  );
}

export function CastSection({ cast }: CastSectionProps) {
  const { hidePosters } = usePosters();

  if (!cast || cast.length === 0) return null;

  if (hidePosters) {
    return (
      <div className="space-y-2.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Cast
        </h3>
        <div className="flex flex-wrap gap-2">
          {cast.map((member) => (
            <Link
              key={member.id}
              href={`/person/${member.id}`}
              className="px-3 py-1.5 rounded-full bg-card border border-border flex items-center gap-1.5 text-xs text-foreground shadow-2xs hover:border-foreground/30 transition"
            >
              <span className="font-medium">{member.name}</span>
              {member.character && (
                <span className="text-muted-foreground text-[11px]">as {member.character}</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    );
  }

  return (
    <ScrollRow
      title={
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Cast
        </h3>
      }
      contentClassName="gap-3"
    >
      {cast.map((member) => (
        <Link
          key={member.id}
          href={`/person/${member.id}`}
          className="flex flex-col items-center w-20 shrink-0 text-center select-none group/cast snap-start"
        >
          <CastAvatar profileUrl={member.profileUrl} name={member.name} />

          <span className="text-xs font-medium text-foreground line-clamp-1 mt-1.5 w-full group-hover/cast:text-brand transition">
            {member.name}
          </span>

          {member.character && (
            <span className="text-[11px] text-muted-foreground line-clamp-1 w-full leading-tight">
              {member.character}
            </span>
          )}
        </Link>
      ))}
    </ScrollRow>
  );
}
