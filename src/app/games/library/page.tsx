"use client";

import Link from "next/link";
import { useGameLibrary } from "@/hooks/use-game-library";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
                                        <Link key={game.id} href={`/games/library/${game.id}`}>
                                            <Card className="hover:opacity-80 transition">
                                                <CardContent className="p-2">
                                                    {coverUrl ? (
                                                        <img src={coverUrl} alt={game.title} className="rounded-md mb-2 w-full" />
                                                    ) : (
                                                        <div className="bg-gray-200 h-64 rounded-md mb-2" />
                                                    )}
                                                    <p className="text-sm font-medium">{game.title}</p>
                                                    <Badge variant="secondary" className="mt-1">
                                                        {game.status.replace(/_/g, " ")}
                                                    </Badge>
                                                </CardContent>
                                            </Card>
                                        </Link>
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