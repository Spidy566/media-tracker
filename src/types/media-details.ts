import type { Entry } from "./entry";

export interface WatchProviderItem {
  id: number;
  name: string;
  logoPath: string;
}

export interface WatchProvidersGroup {
  stream: WatchProviderItem[];
  rent: WatchProviderItem[];
  buy: WatchProviderItem[];
  attribution: string;
}

export interface CastMember {
  id: number;
  name: string;
  character: string;
  profileUrl: string | null;
  profilePath: string | null;
}

export interface CrewMember {
  id: number;
  name: string;
  job: string;
  profilePath: string | null;
}

export interface CollectionPart {
  id: number;
  title: string;
  posterUrl: string | null;
  releaseYear: number | null;
  rating: number | null;
  isCurrent?: boolean;
}

export interface MediaCollection {
  id: number;
  name: string;
  parts: CollectionPart[];
}

export interface TvSeason {
  id: number;
  name: string;
  seasonNumber: number;
  episodeCount: number;
  airDate: string | null;
  posterUrl: string | null;
}

export interface TvNextEpisode {
  id: number;
  name: string;
  seasonNumber: number;
  episodeNumber: number;
  airDate: string | null;
  overview: string | null;
}

export interface GameTimeToBeat {
  hastily: number | null;
  normally: number | null;
  completely: number | null;
}

export interface GameScreenshot {
  id?: number;
  url: string;
  thumbnailUrl: string;
  width?: number;
  height?: number;
}

export interface RecommendationItem {
  id: number | string;
  externalId: string;
  title: string;
  mediaType: "movie" | "tv" | "game";
  posterUrl: string | null;
  backdropUrl?: string | null;
  releaseYear: number | null;
  rating: number | null;
  subtitle?: string | null;
}

export interface MediaDetails {
  id: string;
  externalId: string;
  mediaType: "movie" | "tv" | "game";
  title: string;
  releaseYear: number | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  summary: string | null;
  tagline: string | null;
  genres: string[];
  creator: string | null;
  trailerUrl: string | null;

  // Facts strip
  status: string | null;
  runtimeMinutes: number | null;
  seasonsCount: number | null;
  episodesCount: number | null;
  ageRating: string | null;
  externalScore: number | null;

  // Squad activity
  squadEntries: Entry[];
  squadRatingAverage: number | null;

  // Movies & TV
  watchProviders?: WatchProvidersGroup | null;
  cast?: CastMember[];
  directors?: CrewMember[];
  writers?: CrewMember[];
  composer?: CrewMember | null;
  composers?: CrewMember[];
  creators?: CrewMember[];
  collection?: MediaCollection | null;
  tvSeasons?: TvSeason[];
  tvNextEpisode?: TvNextEpisode | null;

  // Games
  timeToBeat?: GameTimeToBeat | null;
  platforms?: string[];
  gameModes?: string[];
  playerPerspectives?: string[];
  themes?: string[];
  developer?: string | null;
  publisher?: string | null;
  screenshots?: GameScreenshot[];
  franchise?: string | null;

  // Recommendations
  recommendations: RecommendationItem[];
}
