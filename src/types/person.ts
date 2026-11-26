export interface PersonCastCredit {
  externalId: string;
  mediaType: "movie" | "tv";
  title: string;
  year: number | null;
  posterPath: string | null;
  character: string;
  popularity: number;
  voteCount: number;
  genreIds: number[];
  episodeCount?: number;
  isFiltered?: boolean;
}

export interface PersonCrewCredit {
  externalId: string;
  mediaType: "movie" | "tv";
  title: string;
  year: number | null;
  posterPath: string | null;
  job: string;
  popularity: number;
  voteCount: number;
  genreIds: number[];
  isFiltered?: boolean;
}

export interface PersonCrewGroup {
  department: string;
  credits: PersonCrewCredit[];
}

export interface PersonKnownForCredit {
  externalId: string;
  mediaType: "movie" | "tv";
  title: string;
  year: number | null;
  posterPath: string | null;
  character?: string;
  job?: string;
  popularity: number;
  voteCount: number;
}

export interface PersonDetails {
  id: number;
  name: string;
  knownForDepartment: string | null;
  birthday: string | null;
  deathday: string | null;
  placeOfBirth: string | null;
  biography: string | null;
  profilePath: string | null;
  externalIds: {
    imdbId: string | null;
    facebookId: string | null;
    instagramId: string | null;
    twitterId: string | null;
  };
  castCredits: PersonCastCredit[];
  crewGroups: PersonCrewGroup[];
  knownFor: PersonKnownForCredit[];
  hiddenCount: number;
}
