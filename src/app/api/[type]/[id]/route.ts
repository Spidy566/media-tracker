import { NextRequest } from "next/server";
import { movies, games } from "@/db/schema";
import { getById, updateById, deleteById } from "@/lib/api/crud";
import { z } from "zod";

const updateMovieSchema = z.object({
  status: z
    .enum(["PLAN_TO_WATCH", "WATCHING", "COMPLETED", "DROPPED", "ON_HOLD"])
    .optional(),
  rating: z.number().min(1).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const updateGameSchema = z.object({
  status: z
    .enum(["PLAN_TO_PLAY", "PLAYING", "COMPLETED", "DROPPED", "ON_HOLD"])
    .optional(),
  rating: z.number().min(1).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
});

type ResourceType = "movies" | "games";

const apiConfig = {
  movies: {
    table: movies,
    idColumn: movies.id,
    schema: updateMovieSchema,
  },
  games: {
    table: games,
    idColumn: games.id,
    schema: updateGameSchema,
  },
};

type RouteParams = { params: Promise<{ type: ResourceType; id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { type, id } = await params;
  const config = apiConfig[type];

  return getById(config.table, config.idColumn, id);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { type, id } = await params;
  const config = apiConfig[type];
  const body = await request.json();

  return updateById(
    config.table,
    config.idColumn,
    config.schema as z.ZodTypeAny,
    id,
    body,
  );
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { type, id } = await params;
  const config = apiConfig[type];

  return deleteById(config.table, config.idColumn, id);
}
