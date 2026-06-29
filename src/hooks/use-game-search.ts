"use client";

import { useQuery } from "@tanstack/react-query";
import { IGDBGame } from "@/types/igdb";

async function searchGames(query: string): Promise<IGDBGame[]> {
    const res = await fetch(`/api/games/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Failed to search games");
    return res.json();
}

export function useGameSearch(query: string) {
    return useQuery({
        queryKey: ["game-search", query],
        queryFn: () => searchGames(query),
        enabled: query.length > 0,
    });
}