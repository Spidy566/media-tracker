"use client";

import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useGameSearch } from "@/hooks/use-game-search";
import { useAddGame } from "@/hooks/use-add-game";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getIgdbCoverUrl, igdbTimestampToDate } from "@/lib/igdb-helpers";

export default function GameSearchPage() {
    const [query, setQuery] = useState("");
    const debouncedQuery = useDebounce(query, 400);
    const { data, isLoading } = useGameSearch(debouncedQuery);
    const { mutate: addGame, isPending } = useAddGame();

    return (
        <div className="max-w-2xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-4">Search Games</h1>

            <Input
                placeholder="Search for a game..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="mb-6"
            />

            {isLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-64 w-full rounded-md" />
                    ))}
                </div>
            )}

            {!isLoading && query.length > 0 && data?.length === 0 && (
                <p className="text-gray-500">No games found for "{query}".</p>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {data?.map((game) => {
                    const coverUrl = getIgdbCoverUrl(game.cover?.url);
                    return (
                        <Card key={game.id}>
                            <CardContent className="p-2">
                                {coverUrl ? (
                                    <img src={coverUrl} alt={game.name} className="rounded-md mb-2 w-full" />
                                ) : (
                                    <div className="bg-gray-200 h-64 rounded-md mb-2 flex items-center justify-center text-sm text-gray-500">
                                        No image
                                    </div>
                                )}
                                <p className="text-sm font-medium">{game.name}</p>
                                <Button
                                    size="sm"
                                    className="w-full mt-2"
                                    disabled={isPending}
                                    onClick={() =>
                                        addGame({
                                            igdbId: game.id,
                                            title: game.name,
                                            coverUrl: game.cover?.url ?? null,
                                            releaseDate: igdbTimestampToDate(game.first_release_date)?.toISOString() ?? null,
                                            summary: game.summary ?? null,
                                            genres: game.genres?.map((g) => g.name) ?? [],
                                        })
                                    }
                                >
                                    Add to Library
                                </Button>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}