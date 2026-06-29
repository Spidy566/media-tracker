export function getIgdbCoverUrl(url: string | undefined, size: "cover_small" | "cover_big" | "1080p" = "cover_big"): string | null {
    if (!url) return null;
    // IGDB gives protocol-relative URLs like "//images.igdb.com/.../t_thumb/abc.jpg"
    // and a small size by default — we swap in https: and a bigger size
    return `https:${url.replace("t_thumb", `t_${size}`)}`;
}

export function igdbTimestampToDate(timestamp: number | undefined): Date | null {
    if (!timestamp) return null;
    return new Date(timestamp * 1000); // IGDB gives seconds, JS Date wants milliseconds
}