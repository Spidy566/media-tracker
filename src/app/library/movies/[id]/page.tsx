"use client";

import { useParams, useRouter } from "next/navigation";
import { useMovie, useUpdateMovie, useDeleteMovie } from "@/hooks/use-movie-library";
import { MediaDetailView } from "@/components/media-detail-view";
import { MOVIE_STATUSES } from "@/lib/media-status";

export default function MovieDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: movie, isLoading } = useMovie(id);
  const { mutate: updateMovie } = useUpdateMovie();
  const { mutate: deleteMovie, isPending: isDeleting } = useDeleteMovie();

  if (isLoading) return <p className="p-6">Loading...</p>;
  if (!movie) return <p className="p-6">Movie not found.</p>;

  return (
    <MediaDetailView
      title={movie.title}
      imageUrl={movie.posterPath ? `https://image.tmdb.org/t/p/w300${movie.posterPath}` : null}
      subtitle={movie.releaseDate?.toString().slice(0, 10) ?? null}
      description={movie.overview}
      status={movie.status}
      rating={movie.rating}
      notes={movie.notes}
      statuses={MOVIE_STATUSES}
      backHref="/library"
      onStatusChange={(status) => updateMovie({ id: movie.id, status })}
      onRatingChange={(rating) => updateMovie({ id: movie.id, rating })}
      onNotesBlur={(notes) => updateMovie({ id: movie.id, notes })}
      onDelete={() => {
        deleteMovie(movie.id);
        router.push("/library");
      }}
      isDeleting={isDeleting}
    />
  );
}