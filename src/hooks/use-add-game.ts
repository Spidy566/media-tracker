"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AddGameInput } from "@/lib/validations/game";

async function addGame(input: AddGameInput) {
    const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add game");
    }
    return res.json();
}

export function useAddGame() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: addGame,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["game-library"] });
        },
    });
}