import { createLibraryHooks } from "./use-media-library";
import { movies } from "@/db/schema";

type Movie = typeof movies.$inferSelect;

const hooks = createLibraryHooks<Movie>("movies");

export const useMovieLibrary = hooks.useMediaLibrary;
export const useMovie = hooks.useMediaItem;
export const useUpdateMovie = hooks.useUpdateMediaItem;
export const useDeleteMovie = hooks.useDeleteMediaItem;