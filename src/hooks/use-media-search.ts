"use client";

import { useQuery } from "@tanstack/react-query";

type ResourceType = "movies" | "games";

export function useMediaSearch<T>(resource: ResourceType, query: string) {
  return useQuery({
    queryKey: [resource, "search", query],
    queryFn: async (): Promise<T> => {
      const res = await fetch(
        `/api/${resource}/search?query=${encodeURIComponent(query)}`,
      );
      if (!res.ok) throw new Error(`Failed to search ${resource}`);
      return res.json();
    },
    enabled: query.length > 0,
  });
}