"use client";

import { useParams, useRouter, notFound } from "next/navigation";
import { movies, games } from "@/db/schema";
import {
  useMediaItem,
  useUpdateMediaItem,
  useDeleteMediaItem,
} from "@/hooks/use-media-library";
import { MediaDetailView } from "@/components/media-detail-view";
import {
  StatusOption,
  MOVIE_STATUSES,
  GAME_STATUSES,
} from "@/lib/media-status";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";

type ResourceType = "movies" | "games";

type Movie = typeof movies.$inferSelect;
type Game = typeof games.$inferSelect;

type ResourceMap = {
  movies: Movie;
  games: Game;
};

type MediaConfigMap = {
  [K in ResourceType]: MediaConfig<ResourceMap[K]>;
};

interface MediaConfig<T> {
  statuses: StatusOption[];
  getImageUrl: (item: T) => string | null;
  subtitle: (item: T) => string | null;
  description: (item: T) => string | null;
  tags: (item: T) => string[] | undefined;
}

const mediaConfig: MediaConfigMap = {
  movies: {
    statuses: MOVIE_STATUSES,
    getImageUrl: (item) =>
      item.posterPath
        ? `https://image.tmdb.org/t/p/w300${item.posterPath}`
        : null,
    subtitle: (item) => item.releaseDate?.toString().slice(0, 10) ?? null,
    description: (item) => item.overview,
    tags: () => undefined,
  },
  games: {
    statuses: GAME_STATUSES,
    getImageUrl: (item) => getIgdbCoverUrl(item.coverUrl ?? undefined),
    subtitle: (item) => item.releaseDate?.toString().slice(0, 10) ?? null,
    description: (item) => item.summary,
    tags: (item) => item.genres,
  },
};

export default function GenericDetailPage() {
  const router = useRouter();

  const { type, id } = useParams<{ type: string; id: string }>();

  if (type !== "movies" && type !== "games") {
    notFound();
  }

  const { data: item, isLoading } = useMediaItem(type, id);
  const { mutate: updateItem } = useUpdateMediaItem(type);
  const { mutate: deleteItem, isPending: isDeleting } =
    useDeleteMediaItem(type);

  if (isLoading) return <p className="p-6">Loading...</p>;
  if (!item) return <p className="p-6">Item not found.</p>;

  const config = mediaConfig[type] as MediaConfig<Movie | Game>;

  return (
    <MediaDetailView
      title={item.title}
      imageUrl={config.getImageUrl(item)}
      subtitle={config.subtitle(item)}
      description={config.description(item)}
      tags={config.tags(item)}
      status={item.status}
      rating={item.rating}
      notes={item.notes}
      statuses={config.statuses}
      backHref="/library"
      onStatusChange={(status) => updateItem({ id: item.id, status })}
      onRatingChange={(rating) => updateItem({ id: item.id, rating })}
      onNotesBlur={(notes) => updateItem({ id: item.id, notes })}
      onDelete={() => {
        deleteItem(item.id, {
          onSuccess: () => {
            router.push("/library");
          },
        });
      }}
      isDeleting={isDeleting}
    />
  );
}