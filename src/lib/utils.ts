import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getMediaHref(media: { externalId: string; mediaType: string }): string {
  const rawId = media.externalId.split(":").pop();
  return `/media/${media.mediaType}/${rawId}`;
}
