export interface CalendarItem {
  externalId: string;
  mediaType: "movie" | "tv" | "game";
  title: string;
  releaseDate: string | null;
  datePrecision: "day" | "month";
  releaseYear: number | null;
  posterUrl: string | null;
  summary: string | null;
  genres: string[];
  popularity: number;
}

export interface CalendarApiResponse {
  month: string;
  releases: CalendarItem[];
  partial: boolean;
  failedSources: string[];
  gamesSkipped: boolean;
}
