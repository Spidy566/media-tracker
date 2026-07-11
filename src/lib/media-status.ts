export interface StatusOption {
  value: string;
  label: string;
}

export const MOVIE_STATUSES: StatusOption[] = [
  { value: "PLAN_TO_WATCH", label: "Plan to Watch" },
  { value: "WATCHING", label: "Watching" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DROPPED", label: "Dropped" },
  { value: "ON_HOLD", label: "On Hold" },
];

export const GAME_STATUSES: StatusOption[] = [
  { value: "PLAN_TO_PLAY", label: "Plan to Play" },
  { value: "PLAYING", label: "Playing" },
  { value: "COMPLETED", label: "Completed" },
  { value: "DROPPED", label: "Dropped" },
  { value: "ON_HOLD", label: "On Hold" },
];

export function withAllOption(statuses: StatusOption[]): StatusOption[] {
  return [{ value: "ALL", label: "All" }, ...statuses];
}