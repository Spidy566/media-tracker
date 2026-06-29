"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useGame, useUpdateGame, useDeleteGame } from "@/hooks/use-game-library";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getIgdbCoverUrl } from "@/lib/igdb-helpers";

const STATUSES = ["PLAN_TO_PLAY", "PLAYING", "COMPLETED", "DROPPED", "ON_HOLD"];

export default function GameDetailPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { data: game, isLoading } = useGame(id);
    const { mutate: updateGame } = useUpdateGame();
    const { mutate: deleteGame, isPending: isDeleting } = useDeleteGame();

    const [notes, setNotes] = useState("");

    useEffect(() => {
        if (game?.notes) setNotes(game.notes);
    }, [game?.notes]);

    if (isLoading) return <p className="p-6">Loading...</p>;
    if (!game) return <p className="p-6">Game not found.</p>;

    const coverUrl = getIgdbCoverUrl(game.coverUrl ?? undefined);

    return (
        <div className="max-w-2xl mx-auto p-6">
            <Button variant="ghost" onClick={() => router.push("/games/library")} className="mb-4">
                ← Back to Library
            </Button>

            <div className="flex gap-6">
                {coverUrl && <img src={coverUrl} alt={game.title} className="rounded-md w-40" />}
                <div>
                    <h1 className="text-2xl font-bold">{game.title}</h1>
                    <p className="text-sm text-gray-500">{game.releaseDate?.toString().slice(0, 10)}</p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                        {game.genres.map((g) => (
                            <span key={g} className="text-xs bg-gray-100 px-2 py-0.5 rounded">{g}</span>
                        ))}
                    </div>
                    <p className="text-sm mt-2">{game.summary}</p>
                </div>
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
                <div>
                    <label className="text-sm font-medium block mb-1">Status</label>
                    <Select value={game.status} onValueChange={(value) => updateGame({ id: game.id, status: value })}>
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="text-sm font-medium block mb-1">Rating (1-10)</label>
                    <Select
                        value={game.rating?.toString() ?? ""}
                        onValueChange={(value) => updateGame({ id: game.id, rating: Number(value) })}
                    >
                        <SelectTrigger className="w-32"><SelectValue placeholder="Not rated" /></SelectTrigger>
                        <SelectContent>
                            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                                <SelectItem key={n} value={n.toString()}>{n}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div>
                    <label className="text-sm font-medium block mb-1">Notes</label>
                    <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onBlur={() => updateGame({ id: game.id, notes })}
                        placeholder="Your thoughts..."
                        rows={4}
                    />
                </div>

                <Button
                    variant="destructive"
                    disabled={isDeleting}
                    onClick={() => {
                        deleteGame(game.id);
                        router.push("/games/library");
                    }}
                >
                    Remove from Library
                </Button>
            </div>
        </div>
    );
}