"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LibrarySection } from "@/components/library-section";
import { useMovieLibrary } from "@/hooks/use-movie-library";
import { useGameLibrary } from "@/hooks/use-game-library";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";
import { MOVIE_STATUSES, GAME_STATUSES, withAllOption } from "@/lib/media-status";

const MOVIE_FILTERS = withAllOption(MOVIE_STATUSES);
const GAME_FILTERS = withAllOption(GAME_STATUSES);

export default function LibraryPage() {
  const { data: movies, isLoading: moviesLoading } = useMovieLibrary();
  const { data: games, isLoading: gamesLoading } = useGameLibrary();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Library</h1>

      <Tabs defaultValue="movies">
        <TabsList>
          <TabsTrigger value="movies">Movies</TabsTrigger>
          <TabsTrigger value="games">Games</TabsTrigger>
        </TabsList>

        <TabsContent value="movies">
          <LibrarySection
            items={movies}
            isLoading={moviesLoading}
            statuses={MOVIE_FILTERS}
            hrefBase="/library/movies"
            getImageUrl={(movie) =>
              movie.posterPath ? `https://image.tmdb.org/t/p/w300${movie.posterPath}` : null
            }
          />
        </TabsContent>

        <TabsContent value="games">
          <LibrarySection
            items={games}
            isLoading={gamesLoading}
            statuses={GAME_FILTERS}
            hrefBase="/library/games"
            getImageUrl={(game) => getIgdbCoverUrl(game.coverUrl ?? undefined)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}