export interface IGDBGameItem {
  id: number;
  name: string;
  cover?: {
    id: number;
    url: string;
  };
  first_release_date?: number;
  summary?: string;
  rating?: number;
  genres?: { id: number; name: string }[];
  involved_companies?: { company: { name: string } }[];
}
