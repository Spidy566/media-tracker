"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface MediaUpdateInput {
  id: string;
  status?: string;
  rating?: number | null;
  notes?: string | null;
}

export function createLibraryHooks<T>(resource: "movies" | "games") {
  const singular = resource.slice(0, -1);

  async function fetchLibrary(): Promise<T[]> {
    const res = await fetch(`/api/${resource}`);
    if (!res.ok) throw new Error(`Failed to fetch ${resource}`);
    return res.json();
  }

  async function fetchOne(id: string): Promise<T> {
    const res = await fetch(`/api/${resource}/${id}`);
    if (!res.ok) throw new Error(`Failed to fetch ${singular}`);
    return res.json();
  }

  async function update({ id, ...data }: MediaUpdateInput) {
    const res = await fetch(`/api/${resource}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`Failed to update ${singular}`);
    return res.json();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/${resource}/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`Failed to delete ${singular}`);
    return res.json();
  }

  return {
    useMediaLibrary: () => useQuery({ queryKey: [resource], queryFn: fetchLibrary }),
    useMediaItem: (id: string) =>
      useQuery({ queryKey: [singular, id], queryFn: () => fetchOne(id) }),
    useUpdateMediaItem: () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: update,
        onSuccess: (_data, variables) => {
          queryClient.invalidateQueries({ queryKey: [resource] });
          queryClient.invalidateQueries({ queryKey: [singular, variables.id] });
        },
      });
    },
    useDeleteMediaItem: () => {
      const queryClient = useQueryClient();
      return useMutation({
        mutationFn: remove,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: [resource] }),
      });
    },
  };
}