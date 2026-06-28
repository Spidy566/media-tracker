"use client";

import { useState } from "react";
import { useMovieSearch } from "@/hooks/use-movie-search";
import { useAddMovie } from "@/hooks/use-add-movie";
import { useDebounce } from "@/hooks/use-debounce";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 400);
    const { data, isLoading, isError } = useMovieSearch(debouncedQuery);
    const { mutate: addMovie, isPending } = useAddMovie();

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Search Movies</h1>

            <Input
                placeholder="Search for a movie..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mb-6"
            />

            {isLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i}>
                            <Skeleton className="h-64 w-full rounded-md mb-2" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    ))}
                </div>
            )}
            {isError && <p className="text-red-500">Something went wrong.</p>}
            {!isLoading && query.length > 0 && data?.results.length === 0 && (
                <p className="text-gray-500">No movies found for "{query}".</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {data?.results.map((movie) => (
                    <Card key={movie.id}>
                        <CardContent className="p-2">
                            {movie.poster_path ? (
                                <img
                                    src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                                    alt={movie.title}
                                    className="rounded-md mb-2 w-full"
                                />
                            ) : (
                                <div className="bg-gray-200 h-64 rounded-md mb-2 flex items-center justify-center text-sm text-gray-500">
                                    No image
                                </div>
                            )}
                            <p className="text-sm font-medium">{movie.title}</p>
                            <p className="text-xs text-gray-500">{movie.release_date}</p>
                        </CardContent>
                        <Button
                            size="sm"
                            className="w-full mt-2"
                            disabled={isPending}
                            onClick={() =>
                                addMovie({
                                    tmdbId: movie.id,
                                    title: movie.title,
                                    posterPath: movie.poster_path,
                                    releaseDate: movie.release_date || null,
                                    overview: movie.overview,
                                })
                            }
                        >
                            Add to Library
                        </Button>
                    </Card>
                ))}
            </div>
        </div>
    );
}