"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LibrarySection } from "@/components/library-section";
import { useMediaLibrary } from "@/hooks/use-media-library";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import { movies as movieSchema, games as gameSchema } from "@/db/schema";
import {
  MOVIE_STATUSES,
  GAME_STATUSES,
  withAllOption,
  StatusOption,
} from "@/lib/media-status";

type Movie = typeof movieSchema.$inferSelect;
type Game = typeof gameSchema.$inferSelect;

const RESOURCES = ["movies", "games"] as const;
type ResourceType = (typeof RESOURCES)[number];

interface LibraryConfig<T> {
  label: string;
  filters: StatusOption[];
  hrefBase: string;
  getImageUrl: (item: T) => string | null;
}

const libraryConfig: {
  movies: LibraryConfig<Movie>;
  games: LibraryConfig<Game>;
} = {
  movies: {
    label: "Movies",
    filters: withAllOption(MOVIE_STATUSES),
    hrefBase: "/library/movies",
    getImageUrl: (movie) =>
      movie.posterPath
        ? `https://image.tmdb.org/t/p/w300${movie.posterPath}`
        : null,
  },
  games: {
    label: "Games",
    filters: withAllOption(GAME_STATUSES),
    hrefBase: "/library/games",
    getImageUrl: (game) => getIgdbCoverUrl(game.coverUrl ?? undefined),
  },
};

export default function LibraryPage() {
  const { data: movies, isLoading: moviesLoading } = useMediaLibrary("movies");
  const { data: games, isLoading: gamesLoading } = useMediaLibrary("games");

  const libraryData: Record<
    ResourceType,
    { items: Movie[] | Game[] | undefined; isLoading: boolean }
  > = {
    movies: { items: movies, isLoading: moviesLoading },
    games: { items: games, isLoading: gamesLoading },
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Library</h1>

      <Tabs defaultValue="movies">
        <TabsList>
          {RESOURCES.map((res) => (
            <TabsTrigger key={res} value={res}>
              {libraryConfig[res].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {RESOURCES.map((res) => {
          const config = libraryConfig[res] as LibraryConfig<Movie | Game>;
          const data = libraryData[res];

          return (
            <TabsContent key={res} value={res}>
              <LibrarySection
                items={data.items}
                isLoading={data.isLoading}
                statuses={config.filters}
                hrefBase={config.hrefBase}
                getImageUrl={config.getImageUrl}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
