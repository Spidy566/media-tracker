"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Movie } from "@prisma/client";

async function fetchLibrary(): Promise<Movie[]> {
    const res = await fetch("/api/movies");
    if (!res.ok) throw new Error("Failed to fetch library");
    return res.json();
}

export function useLibrary() {
    return useQuery({
        queryKey: ["library"],
        queryFn: fetchLibrary,
    });
}

async function fetchMovie(id: string): Promise<Movie> {
    const res = await fetch(`/api/movies/${id}`);
    if (!res.ok) throw new Error("Failed to fetch movie");
    return res.json();
}

export function useMovie(id: string) {
    return useQuery({
        queryKey: ["movie", id],
        queryFn: () => fetchMovie(id),
    });
}

async function updateMovie({
                               id,
                               ...data
                           }: { id: string; status?: string; rating?: number | null; notes?: string | null }) {
    const res = await fetch(`/api/movies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to update movie");
    return res.json();
}

export function useUpdateMovie() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: updateMovie,
        onSuccess: (_data, variables) => {
            queryClient.invalidateQueries({ queryKey: ["library"] });
            queryClient.invalidateQueries({ queryKey: ["movie", variables.id] });
        },
    });
}

async function deleteMovie(id: string) {
    const res = await fetch(`/api/movies/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete movie");
    return res.json();
}

export function useDeleteMovie() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteMovie,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["library"] });
        },
    });
}