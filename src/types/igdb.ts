export interface IGDBGame {
    id: number;
    name: string;
    cover?: {
        id: number;
        url: string;
    };
    first_release_date?: number;
    genres?: { id: number; name: string }[];
    summary?: string;
}