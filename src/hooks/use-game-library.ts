"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Game } from "@prisma/client";

async function fetchGameLibrary(): Promise<Game[]> {
    const res = await fetch("/api/games");
    if (!res.ok) throw new Error("Failed to fetch game library");
    return res.json();
}

export function useGameLibrary() {
    return useQuery({ queryKey: ["game-library"], queryFn: fetchGameLibrary });
}

async function fetchGame(id: string): Promise<Game> {
    const res = await fetch(`/api/games/${id}`);
    if (!res.ok) throw new Error("Failed to fetch game");
    return res.json();
}

export function useGame(id: string) {
    return useQuery({ queryKey: ["game", id], queryFn: () => fetchGame(id) });
}

async function updateGame({
                              id,
                              ...data
                          }: { id: string; status?: string; rating?: number | null; notes?: string | null }) {
    const res = await fetch(`/api/games/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update game");
    return res.json();
}

export function useUpdateGame() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateGame,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["game-library"] });
            queryClient.invalidateQueries({ queryKey: ["game", variables.id] });
        },
    });
}

async function deleteGame(id: string) {
    const res = await fetch(`/api/games/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete game");
    return res.json();
}

export function useDeleteGame() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteGame,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["game-library"] }),
    });
}