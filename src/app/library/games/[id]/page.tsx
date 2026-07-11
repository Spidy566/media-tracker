"use client";

import { useParams, useRouter } from "next/navigation";
import { useGame, useUpdateGame, useDeleteGame } from "@/hooks/use-game-library";
import { MediaDetailView } from "@/components/media-detail-view";
import { GAME_STATUSES } from "@/lib/media-status";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";

export default function GameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: game, isLoading } = useGame(id);
  const { mutate: updateGame } = useUpdateGame();
  const { mutate: deleteGame, isPending: isDeleting } = useDeleteGame();

  if (isLoading) return <p className="p-6">Loading...</p>;
  if (!game) return <p className="p-6">Game not found.</p>;

  return (
    <MediaDetailView
      title={game.title}
      imageUrl={getIgdbCoverUrl(game.coverUrl ?? undefined)}
      subtitle={game.releaseDate?.toString().slice(0, 10) ?? null}
      description={game.summary}
      tags={game.genres}
      status={game.status}
      rating={game.rating}
      notes={game.notes}
      statuses={GAME_STATUSES}
      backHref="/library"
      onStatusChange={(status) => updateGame({ id: game.id, status })}
      onRatingChange={(rating) => updateGame({ id: game.id, rating })}
      onNotesBlur={(notes) => updateGame({ id: game.id, notes })}
      onDelete={() => {
        deleteGame(game.id);
        router.push("/library");
      }}
      isDeleting={isDeleting}
    />
  );
}