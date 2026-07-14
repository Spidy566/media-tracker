"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { movies, games } from "@/db/schema";

type Movie = typeof movies.$inferSelect;
type Game = typeof games.$inferSelect;

type ResourceType = "movies" | "games";

type ResourceMap = {
  movies: Movie;
  games: Game;
};

interface MediaUpdateInput {
  id: string;
  status?: string;
  rating?: number | null;
  notes?: string | null;
}

// API Helpers
async function fetchLibrary<R extends ResourceType>(
  resource: R,
): Promise<ResourceMap[R][]> {
  const res = await fetch(`/api/${resource}`);
  if (!res.ok) throw new Error(`Failed to fetch ${resource}`);
  return res.json();
}

async function fetchOne<R extends ResourceType>(
  id: string,
  resource: R,
): Promise<ResourceMap[R]> {
  const singular = resource.slice(0, -1);
  const res = await fetch(`/api/${resource}/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch ${singular}`);
  return res.json();
}

async function update(
  { id, ...data }: MediaUpdateInput,
  resource: ResourceType,
) {
  const singular = resource.slice(0, -1);
  const res = await fetch(`/api/${resource}/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update ${singular}`);
  return res.json();
}

async function remove(id: string, resource: ResourceType) {
  const singular = resource.slice(0, -1);
  const res = await fetch(`/api/${resource}/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Failed to delete ${singular}`);
  return res.json();
}

// Hooks
export function useMediaLibrary<R extends ResourceType>(resource: R) {
  return useQuery({
    queryKey: [resource],
    queryFn: () => fetchLibrary(resource),
  });
}

export function useMediaItem<R extends ResourceType>(resource: R, id: string) {
  const singular = resource.slice(0, -1);
  return useQuery({
    queryKey: [singular, id],
    queryFn: () => fetchOne(id, resource),
  });
}

export function useUpdateMediaItem(resource: ResourceType) {
  const singular = resource.slice(0, -1);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: MediaUpdateInput) => update(variables, resource),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [resource] });
      queryClient.invalidateQueries({ queryKey: [singular, variables.id] });
    },
  });
}

export function useDeleteMediaItem(resource: ResourceType) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => remove(id, resource),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [resource] }),
  });
}
