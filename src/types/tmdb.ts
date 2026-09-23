export interface TMDBMediaItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  vote_average?: number;
}

export interface TMDBResponse {
  page: number;
  results: TMDBMediaItem[];
  total_pages: number;
  total_results: number;
}
