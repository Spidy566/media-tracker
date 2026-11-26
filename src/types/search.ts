export interface UnifiedSearchResult {
  externalId: string;
  mediaType: "movie" | "tv" | "game";
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  creator: string | null;
  summary: string | null;
  genres: string[];
}
