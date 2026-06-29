import { z } from "zod";

export const addGameSchema = z.object({
    igdbId: z.number(),
    title: z.string().min(1),
    coverUrl: z.string().nullable(),
    releaseDate: z.string().nullable(), // ISO string, we'll convert server-side
    summary: z.string().nullable(),
    genres: z.array(z.string()),
});

export type AddGameInput = z.infer<typeof addGameSchema>;
