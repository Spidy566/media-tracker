export interface LogEntryPayload {
  media: {
    externalId: string;
    mediaType: "movie" | "tv" | "game";
    title: string;
    releaseYear?: number | null;
    posterUrl?: string | null;
    backdropUrl?: string | null;
    creator?: string | null;
    summary?: string | null;
    genres?: string[];
  };
  status: "want_to" | "doing" | "done" | "dropped";
  rating?: number | null;
  reviewNote?: string | null;
}

export async function logEntryApi(payload: LogEntryPayload) {
  const res = await fetch("/api/entries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to update entry");
  }

  return res.json();
}

export async function deleteEntryApi(id: string) {
  const res = await fetch(`/api/entries?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  if (res.status === 401) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to remove entry");
  }

  return res.json();
}
