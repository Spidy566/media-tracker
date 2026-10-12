import { env } from "@/lib/env";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function tmdbFetch(endpoint: string, retries = 2) {
  const apiKey = env.TMDB_API_KEY;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${TMDB_BASE_URL}${endpoint}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`TMDB API error: ${res.status}`);
      }

      return await res.json();
    } catch (err) {
      if (attempt === retries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  throw new Error("Failed to fetch TMDB data");
}
