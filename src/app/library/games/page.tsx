"use client";

import { useGameLibrary } from "@/hooks/use-game-library";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MediaCard } from "@/components/media-card";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";

const STATUSES = [
    { value: "ALL", label: "All" },
    { value: "PLAN_TO_PLAY", label: "Plan to Play" },
    { value: "PLAYING", label: "Playing" },
    { value: "COMPLETED", label: "Completed" },
    { value: "DROPPED", label: "Dropped" },
    { value: "ON_HOLD", label: "On Hold" },
];

export default function GameLibraryPage() {
    const { data: games, isLoading } = useGameLibrary();

    if (isLoading) return <p className="p-6">Loading...</p>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">My Game Library</h1>

            <Tabs defaultValue="ALL">
                <TabsList>
                    {STATUSES.map((s) => (
                        <TabsTrigger key={s.value} value={s.value}>{s.label}</TabsTrigger>
                    ))}
                </TabsList>

                {STATUSES.map((s) => {
                    const filtered = s.value === "ALL" ? games : games?.filter((g) => g.status === s.value);
                    return (
                        <TabsContent key={s.value} value={s.value}>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                                {filtered?.map((game) => {
                                    const coverUrl = getIgdbCoverUrl(game.coverUrl ?? undefined);

                                    return (
                                        <MediaCard 
                                            key={game.id}
                                            title={game.title}
                                            imageUrl={coverUrl || null}
                                            href={`/library/games/${game.id}`}
                                            status={game.status}
                                        />
                                    );
                                })}
                            </div>
                            {filtered?.length === 0 && <p className="text-gray-500 mt-4">Nothing here yet.</p>}
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}