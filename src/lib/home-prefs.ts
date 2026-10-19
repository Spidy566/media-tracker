export const HOME_HIDDEN_COOKIE = "home_hidden";

export const HOME_SECTIONS = ["squad", "jump", "queue", "trending"] as const;

export type HomeSection = (typeof HOME_SECTIONS)[number];

export function parseHiddenSections(value?: string | null): HomeSection[] {
  if (!value) return [];
  const parts = value.split(",").map((s) => s.trim());
  return HOME_SECTIONS.filter((section) => parts.includes(section as HomeSection));
}
