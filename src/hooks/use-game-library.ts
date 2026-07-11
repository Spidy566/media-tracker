import { createLibraryHooks } from "./use-media-library";
import { games } from "@/db/schema";

type Game = typeof games.$inferSelect;

const hooks = createLibraryHooks<Game>("games");

export const useGameLibrary = hooks.useMediaLibrary;
export const useGame = hooks.useMediaItem;
export const useUpdateGame = hooks.useUpdateMediaItem;
export const useDeleteGame = hooks.useDeleteMediaItem;