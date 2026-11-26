export const GENRE_MAP: Record<string, { tmdbMovie?: number; tmdbTv?: number; igdb?: number }> = {
  Action: { tmdbMovie: 28, igdb: 4 },
  Adventure: { tmdbMovie: 12, igdb: 31 },
  "Action & Adventure": { tmdbTv: 10759 },
  Animation: { tmdbMovie: 16, tmdbTv: 16 },
  Comedy: { tmdbMovie: 35, tmdbTv: 35 },
  Crime: { tmdbMovie: 80, tmdbTv: 80 },
  Horror: { tmdbMovie: 27, igdb: 19 },
  "Sci-Fi": { tmdbMovie: 878, tmdbTv: 10765, igdb: 18 },
  RPG: { igdb: 12 },
  Shooter: { igdb: 5 },
  Strategy: { igdb: 15 },
};

export function getGenresForType(type: "movie" | "tv" | "game"): string[] {
  return Object.keys(GENRE_MAP).filter((genre) => {
    const entry = GENRE_MAP[genre];
    if (type === "movie") return typeof entry.tmdbMovie === "number";
    if (type === "tv") return typeof entry.tmdbTv === "number";
    if (type === "game") return typeof entry.igdb === "number";
    return false;
  });
}

export const TMDB_GENRE_NAMES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};
