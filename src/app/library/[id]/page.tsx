"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useMovie, useUpdateMovie, useDeleteMovie } from "@/hooks/use-library";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const STATUSES = ["PLAN_TO_WATCH", "WATCHING", "COMPLETED", "DROPPED", "ON_HOLD"];

export default function MovieDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data: movie, isLoading } = useMovie(id);
    const { mutate: updateMovie } = useUpdateMovie();
    const { mutate: deleteMovie, isPending: isDeleting } = useDeleteMovie();

    const [notes, setNotes] = useState("");

    // Sync local notes state once movie data loads
    useEffect(() => {
        if (movie?.notes) setNotes(movie.notes);
    }, [movie?.notes]);

    if (isLoading) return <p className="p-6">Loading...</p>;
    if (!movie) return <p className="p-6">Movie not found.</p>;

    return (
        <div className="max-w-2xl mx-auto p-6">
            <Button variant="ghost" onClick={() => router.push("/library")} className="mb-4">
                ← Back to Library
            </Button>

            <div className="flex gap-6">
                {movie.posterPath && (
                    <img
                        src={`https://image.tmdb.org/t/p/w300${movie.posterPath}`}
                        alt={movie.title}
                        className="rounded-md w-40"
                    />
                )}
                <div>
                    <h1 className="text-2xl font-bold">{movie.title}</h1>
                    <p className="text-sm text-gray-500">{movie.releaseDate?.toString().slice(0, 10)}</p>
                    <p className="text-sm mt-2">{movie.overview}</p>
                </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium block mb-1">Status</label>
                    <Select
                        value={movie.status}
                        onValueChange={(value) => updateMovie({ id: movie.id, status: value })}
                    >
                        <SelectTrigger className="w-48">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {s.replace(/_/g, " ")}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="text-sm font-medium block mb-1">Rating (1-10)</label>
                    <Select
                        value={movie.rating?.toString() ?? ""}
                        onValueChange={(value) => updateMovie({ id: movie.id, rating: Number(value) })}
                    >
                        <SelectTrigger className="w-32">
                            <SelectValue placeholder="Not rated" />
                        </SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                <SelectItem key={n} value={n.toString()}>
                                    {n}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="text-sm font-medium block mb-1">Notes</label>
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={() => updateMovie({ id: movie.id, notes })}
                        placeholder="Your thoughts..."
                        rows={4}
                    />
                </div>

                <Button
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => {
                        deleteMovie(movie.id);
                        router.push("/library");
                    }}
                >
                    Remove from Library
                </Button>
            </div>
        </div>
    );
}