"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AddMovieInput } from "@/lib/validations/movie";

async function addMovie(input: AddMovieInput) {
    const res = await fetch("/api/movies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
    });
    if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add movie");
    }
    return res.json();
}

export function useAddMovie() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: addMovie,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["library"] });
        },
    });
}