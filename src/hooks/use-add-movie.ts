import { createAddMediaHook } from "./use-add-media";
import type { AddMovieInput } from "@/lib/validations/movie";

export const useAddMovie = createAddMediaHook<AddMovieInput>("movies");