"use client";

import Link from "next/link";
import { useLibrary } from "@/hooks/use-library";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const STATUSES = [
    { value: "ALL", label: "All" },
    { value: "PLAN_TO_WATCH", label: "Plan to Watch" },
    { value: "WATCHING", label: "Watching" },
    { value: "COMPLETED", label: "Completed" },
    { value: "DROPPED", label: "Dropped" },
    { value: "ON_HOLD", label: "On Hold" },
];

export default function LibraryPage() {
    const { data: movies, isLoading } = useLibrary();

    if (isLoading) return <p className="p-6">Loading...</p>;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-2xl font-bold mb-6">My Library</h1>

            <Tabs defaultValue="ALL">
                <TabsList>
                    {STATUSES.map((s) => (
                        <TabsTrigger key={s.value} value={s.value}>
                            {s.label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {STATUSES.map((s) => {
                    const filtered =
                        s.value === "ALL"
                            ? movies
                            : movies?.filter((m) => m.status === s.value);

                    return (
                        <TabsContent key={s.value} value={s.value}>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                                {filtered?.map((movie) => (
                                    <Link key={movie.id} href={`/library/${movie.id}`}>
                                        <Card className="hover:opacity-80 transition">
                                            <CardContent className="p-2">
                                                {movie.posterPath ? (
                                                    <img
                                                        src={`https://image.tmdb.org/t/p/w300${movie.posterPath}`}
                                                        alt={movie.title}
                                                        className="rounded-md mb-2 w-full"
                                                    />
                                                ) : (
                                                    <div className="bg-gray-200 h-64 rounded-md mb-2" />
                                                )}
                                                <p className="text-sm font-medium">{movie.title}</p>
                                                <Badge variant="secondary" className="mt-1">
                                                    {movie.status.replace(/_/g, " ")}
                                                </Badge>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                            </div>
                            {filtered?.length === 0 && (
                                <p className="text-gray-500 mt-4">Nothing here yet.</p>
                            )}
                        </TabsContent>
                    );
                })}
            </Tabs>
        </div>
    );
}