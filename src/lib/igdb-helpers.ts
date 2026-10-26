export function getIgdbCoverUrl(
  url: string | undefined | null,
  size: "cover_small" | "cover_big" | "1080p" = "cover_big",
): string | null {
  if (!url) return null;
  const normalized = url.startsWith("//")
    ? `https:${url}`
    : url.startsWith("http")
      ? url
      : `https://${url}`;
  return normalized.replace("t_thumb", `t_${size}`);
}

export interface IgdbImageItem {
  url?: string;
  width?: number;
  height?: number;
}

async function verifyHeadUrl(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(2500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function selectIgdbBackdrop(
  artworks?: IgdbImageItem[] | null,
  screenshots?: IgdbImageItem[] | null,
): Promise<string | null> {
  const candidates: string[] = [];

  // 1. Prefer landscape screenshots (width >= 1920, width > height), widest first
  if (screenshots && Array.isArray(screenshots) && screenshots.length > 0) {
    const highResScreenshots = screenshots.filter(
      (s) => s.url && s.width && s.height && s.width >= 1920 && s.width > s.height,
    );
    highResScreenshots.sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    for (const s of highResScreenshots) {
      if (s.url) {
        const normalized = s.url.startsWith("http") ? s.url : `https:${s.url}`;
        candidates.push(normalized.replace("t_thumb", "t_1080p"));
      }
    }

    // Other landscape screenshots under 1920
    const otherLandscapeScreenshots = screenshots.filter(
      (s) => s.url && s.width && s.height && s.width < 1920 && s.width > s.height,
    );
    otherLandscapeScreenshots.sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    for (const s of otherLandscapeScreenshots) {
      if (s.url) {
        const normalized = s.url.startsWith("http") ? s.url : `https:${s.url}`;
        candidates.push(normalized.replace("t_thumb", "t_1080p"));
      }
    }
  }

  // 2. Artworks second (landscape artworks: width > height, width >= 1280)
  if (artworks && Array.isArray(artworks) && artworks.length > 0) {
    const landscapeArtworks = artworks.filter(
      (a) => a.url && a.width && a.height && a.width > a.height && a.width >= 1280,
    );
    landscapeArtworks.sort((a, b) => (b.width ?? 0) - (a.width ?? 0));
    for (const a of landscapeArtworks) {
      if (a.url) {
        const normalized = a.url.startsWith("http") ? a.url : `https:${a.url}`;
        candidates.push(normalized.replace("t_thumb", "t_1080p"));
      }
    }

    // Other artworks
    const otherArtworks = artworks.filter(
      (a) => a.url && (!a.width || !a.height || a.width <= a.height || a.width < 1280),
    );
    for (const a of otherArtworks) {
      if (a.url) {
        const normalized = a.url.startsWith("http") ? a.url : `https:${a.url}`;
        candidates.push(normalized.replace("t_thumb", "t_1080p"));
      }
    }
  }

  // 3. Fallback: any remaining screenshot
  if (screenshots && Array.isArray(screenshots)) {
    for (const s of screenshots) {
      if (s.url) {
        const normalized = s.url.startsWith("http") ? s.url : `https:${s.url}`;
        const url1080 = normalized.replace("t_thumb", "t_1080p");
        if (!candidates.includes(url1080)) {
          candidates.push(url1080);
        }
      }
    }
  }

  // Skip any candidate whose URL fails a HEAD request
  for (const candidate of candidates) {
    const valid = await verifyHeadUrl(candidate);
    if (valid) {
      return candidate;
    }
  }

  return null;
}
