/**
 * Utility functions for normalizing TMDB and IGDB media image URLs.
 * Ensures all poster and backdrop URLs are complete, secure, and properly sized.
 */

export function normalizePosterUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // TMDB relative path
  if (trimmed.startsWith("/")) {
    return `https://image.tmdb.org/t/p/w500${trimmed}`;
  }

  // TMDB full path
  if (trimmed.includes("image.tmdb.org")) {
    const filename = trimmed.split("/").pop();
    if (filename) {
      return `https://image.tmdb.org/t/p/w500/${filename}`;
    }
  }

  // IGDB
  if (trimmed.includes("igdb.com")) {
    const withHttps = trimmed.startsWith("//")
      ? `https:${trimmed}`
      : trimmed.startsWith("http")
        ? trimmed
        : `https://${trimmed}`;
    return withHttps.replace("t_thumb", "t_cover_big");
  }

  // Fallback: prepend https: if protocol-relative
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  return trimmed;
}

export function normalizeBackdropUrl(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // TMDB relative path
  if (trimmed.startsWith("/")) {
    return `https://image.tmdb.org/t/p/w1280${trimmed}`;
  }

  // TMDB full path
  if (trimmed.includes("image.tmdb.org")) {
    const filename = trimmed.split("/").pop();
    if (filename) {
      return `https://image.tmdb.org/t/p/w1280/${filename}`;
    }
  }

  // IGDB
  if (trimmed.includes("igdb.com")) {
    const withHttps = trimmed.startsWith("//")
      ? `https:${trimmed}`
      : trimmed.startsWith("http")
        ? trimmed
        : `https://${trimmed}`;
    return withHttps.replace("t_thumb", "t_1080p");
  }

  // Fallback: prepend https: if protocol-relative
  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  return trimmed;
}
