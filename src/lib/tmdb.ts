const TMDB_BASE_URL = "https://api.themoviedb.org/3";

export async function tmdbFetch(endpoint: string) {
    const res = await fetch(`${TMDB_BASE_URL}${endpoint}`, {
        headers: {
            Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
            Accept: "application/json",
        },
    });

    if (!res.ok) {
        throw new Error(`TMDB API error: ${res.status}`);
    }

    return res.json();
}