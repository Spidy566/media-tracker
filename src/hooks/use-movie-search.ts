"use client";

import { useQuery } from "@tanstack/react-query";
import { TMDBSearchResponse } from "@/types/tmdb";

async function searchMovies(query: string): Promise<TMDBSearchResponse> {
    const res = await fetch(`/api/movies/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Failed to search movies");
    return res.json();
}

export function useMovieSearch(query: string) {
    return useQuery({
        queryKey: ["movie-search", query],
        queryFn: () => searchMovies(query),
        enabled: query.length > 0, // don't fetch on empty string
    });
}