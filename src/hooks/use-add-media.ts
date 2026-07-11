"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function createAddMediaHook<TInput>(resource: "movies" | "games") {
  async function addItem(input: TInput) {
    const res = await fetch(`/api/${resource}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || `Failed to add ${resource.slice(0, -1)}`);
    }
    return res.json();
  }

  return function useAddMedia() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: addItem,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: [resource] }),
    });
  };
}