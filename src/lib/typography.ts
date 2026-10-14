/**
 * Scales hero and media detail display titles by character length:
 * - Up to 18 characters: text-[clamp(2.75rem,6vw,5.5rem)]
 * - 19 to 32 characters: text-[clamp(2.25rem,4.5vw,4rem)]
 * - Longer (33+): text-[clamp(1.75rem,3.5vw,3rem)]
 */
export function getHeroTitleSizeClass(title: string): string {
  const len = title.length;
  if (len <= 18) {
    return "text-[clamp(2.75rem,6vw,5.5rem)]";
  }
  if (len <= 32) {
    return "text-[clamp(2.25rem,4.5vw,4rem)]";
  }
  return "text-[clamp(1.75rem,3.5vw,3rem)]";
}
