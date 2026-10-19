"use client";

import Image from "next/image";
import Link from "next/link";
import { usePosters } from "@/components/providers/poster-provider";
import { ScrollRow } from "@/components/scroll-row";
import type { CastMember } from "@/types/media-details";

interface CastSectionProps {
  cast: CastMember[] | undefined | null;
}

export function CastSection({ cast }: CastSectionProps) {
  const { hidePosters } = usePosters();

  if (!cast || cast.length === 0) return null;

  if (hidePosters) {
    return (
      <div className="space-y-3">
        <h3 className="text-xs font-semibold text-foreground">Cast</h3>
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
    <ScrollRow title={<h3 className="text-xs font-semibold text-foreground">Cast</h3>}>
      {cast.map((member) => {
        const initials = member.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("");

        return (
          <Link
            key={member.id}
            href={`/person/${member.id}`}
            className="flex flex-col items-center w-20 shrink-0 text-center select-none group/cast"
          >
            <div className="relative size-14 rounded-full overflow-hidden bg-muted border border-border shadow-2xs group-hover/cast:border-foreground/30 transition">
              {member.profileUrl ? (
                <Image
                  src={member.profileUrl}
                  alt={member.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-card text-muted-foreground font-medium text-xs">
                  {initials}
                </div>
              )}
            </div>

            <span className="text-xs font-medium text-foreground line-clamp-1 mt-1.5 w-full group-hover/cast:opacity-80 transition">
              {member.name}
            </span>

            {member.character && (
              <span className="text-[11px] text-muted-foreground line-clamp-1 w-full leading-tight">
                {member.character}
              </span>
            )}
          </Link>
        );
      })}
    </ScrollRow>
  );
}
