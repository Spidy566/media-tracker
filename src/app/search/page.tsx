"use client";

import { useState } from "react";
import { useMovieSearch } from "@/hooks/use-movie-search";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const { data, isLoading, isError } = useMovieSearch(query);

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Search Movies</h1>

            <Input
                placeholder="Search for a movie..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mb-6"
            />

            {isLoading && <p>Loading...</p>}
            {isError && <p className="text-red-500">Something went wrong.</p>}

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
                    </Card>
                ))}
            </div>
        </div>
    );
}