import { z } from "zod";

export const addMovieSchema = z.object({
    tmdbId: z.number(),
    title: z.string().min(1),
    posterPath: z.string().nullable(),
    releaseDate: z.string().nullable(),
    overview: z.string().nullable(),
});

export type AddMovieInput = z.infer<typeof addMovieSchema>;