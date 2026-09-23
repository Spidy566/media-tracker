export function getIgdbCoverUrl(
  url: string | undefined,
  size: "cover_small" | "cover_big" | "1080p" = "cover_big",
): string | null {
  if (!url) return null;
  return `https:${url.replace("t_thumb", `t_${size}`)}`;
}
