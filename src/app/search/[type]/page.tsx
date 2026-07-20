"use client";

import { useState } from "react";
import { useParams, notFound } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { useMediaSearch } from "@/hooks/use-media-search";
import { useAddMedia } from "@/hooks/use-add-media";
import { useMediaLibrary } from "@/hooks/use-media-library";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MediaCard } from "@/components/media-card";
import { SearchSkeletonGrid } from "@/components/search-skeleton-grid";
import { getIgdbCoverUrl, igdbTimestampToDate } from "@/lib/igdb-helpers";
import { movies as movieSchema, games as gameSchema } from "@/db/schema";

import type { TMDBMovie, TMDBSearchResponse } from "@/types/tmdb";
import type { IGDBGame } from "@/types/igdb";

type ResourceType = "movies" | "games";

type Movie = typeof movieSchema.$inferSelect;
type Game = typeof gameSchema.$inferSelect;

interface SearchConfig<TResponse, TItem, TLibraryItem> {
  title: string;
  placeholder: string;
  getResults: (data: TResponse) => TItem[];
  getCardProps: (item: TItem) => { title: string; imageUrl: string | null };
  getAddPayload: (item: TItem) => unknown;
  isInLibrary: (item: TItem, libraryItems: TLibraryItem[]) => boolean;
}

const movieSearchConfig: SearchConfig<TMDBSearchResponse, TMDBMovie, Movie> = {
  title: "Search Movies",
  placeholder: "Search for a movie...",
  getResults: (data) => data?.results ?? [],
  getCardProps: (movie) => ({
    title: movie.title,
    imageUrl: movie.poster_path
      ? `https://image.tmdb.org/t/p/w300${movie.poster_path}`
      : null,
  }),
  getAddPayload: (movie) => ({
    tmdbId: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    releaseDate: movie.release_date || null,
    overview: movie.overview,
  }),
  isInLibrary: (movie, libraryItems) =>
    libraryItems?.some((m) => m.tmdbId === movie.id) ?? false,
};

const gameSearchConfig: SearchConfig<IGDBGame[], IGDBGame, Game> = {
  title: "Search Games",
  placeholder: "Search for a game...",
  getResults: (data) => data ?? [],
  getCardProps: (game) => ({
    title: game.name,
    imageUrl: getIgdbCoverUrl(game.cover?.url),
  }),
  getAddPayload: (game) => ({
    igdbId: game.id,
    title: game.name,
    coverUrl: game.cover?.url ?? null,
    releaseDate:
      igdbTimestampToDate(game.first_release_date)?.toISOString() ?? null,
    summary: game.summary ?? null,
    genres: game.genres?.map((g) => g.name) ?? [],
  }),
  isInLibrary: (game, libraryItems) =>
    libraryItems?.some((g) => g.igdbId === game.id) ?? false,
};

const configs = {
  movies: movieSearchConfig,
  games: gameSearchConfig,
} as const;

export default function GenericSearchPage() {
  const { type } = useParams<{ type: string }>();

  if (type !== "movies" && type !== "games") {
    notFound();
  }

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 400);

  if (type === "movies") {
    return (
      <SearchContainer
        type="movies"
        query={query}
        setQuery={setQuery}
        debouncedQuery={debouncedQuery}
        config={configs.movies}
      />
    );
  }

  return (
    <SearchContainer
      type="games"
      query={query}
      setQuery={setQuery}
      debouncedQuery={debouncedQuery}
      config={configs.games}
    />
  );
}

interface SearchContainerProps<TResponse, TItem, TLibraryItem> {
  type: ResourceType;
  query: string;
  setQuery: (val: string) => void;
  debouncedQuery: string;
  config: SearchConfig<TResponse, TItem, TLibraryItem>;
}

function SearchContainer<TResponse, TItem, TLibraryItem>({
  type,
  query,
  setQuery,
  debouncedQuery,
  config,
}: SearchContainerProps<TResponse, TItem, TLibraryItem>) {
  const { data, isLoading, isError } = useMediaSearch<TResponse>(
    type,
    debouncedQuery,
  );
  const { mutate: addMedia, isPending } = useAddMedia(type);
  const { data: libraryItems } = useMediaLibrary(type);

  const results = data ? config.getResults(data) : [];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{config.title}</h1>

      <Input
        placeholder={config.placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-6"
      />

      {isLoading && <SearchSkeletonGrid />}
      {isError && <p className="text-red-500">Something went wrong.</p>}

      {!isLoading && query.length > 0 && results.length === 0 && (
        <p className="text-gray-500">
          No results found for &quot;{query}&quot;.
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {results.map((item, index) => {
          const card = config.getCardProps(item);
          const inLibrary = config.isInLibrary(
            item,
            (libraryItems ?? []) as TLibraryItem[],
          );

          return (
            <MediaCard
              key={index}
              title={card.title}
              imageUrl={card.imageUrl}
              actionButton={
                <Button
                  size="sm"
                  className="w-full"
                  disabled={isPending || inLibrary}
                  variant={inLibrary ? "outline" : "default"}
                  onClick={() => addMedia(config.getAddPayload(item))}
                >
                  {inLibrary ? "In Library" : "Add to Library"}
                </Button>
              }
            />
          );
        })}
      </div>
    </div>
  );
}
