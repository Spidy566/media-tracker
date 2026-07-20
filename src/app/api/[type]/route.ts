import { NextRequest, NextResponse } from "next/server";
import { movies, games } from "@/db/schema";
import { addMovieSchema } from "@/lib/validations/movie";
import { addGameSchema } from "@/lib/validations/game";
import type { AddMovieInput } from "@/lib/validations/movie";
import type { AddGameInput } from "@/lib/validations/game";
import { listAll, createOne } from "@/lib/api/crud";

type ResourceType = "movies" | "games";

const apiConfig = {
  movies: {
    table: movies,
    schema: addMovieSchema,
    orderColumn: movies.createdAt,
    duplicateMessage: "Movie already in your library",
  },
  games: {
    table: games,
    schema: addGameSchema,
    orderColumn: games.createdAt,
    duplicateMessage: "Game already in your library",
  },
};

type RouteParams = { params: Promise<{ type: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { type } = await params;
  if (type !== "movies" && type !== "games") {
    return NextResponse.json({ error: "Invalid resource type" }, { status: 400 });
  }
  const config = apiConfig[type];

  return listAll(config.table, config.orderColumn);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { type } = await params;
  if (type !== "movies" && type !== "games") {
    return NextResponse.json({ error: "Invalid resource type" }, { status: 400 });
  }
  const config = apiConfig[type];
  const body = await request.json();

  return createOne(
    config.table,
    config.schema,
    body,
    config.duplicateMessage,
    (data: AddMovieInput | AddGameInput) => ({
      ...data,
      releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
    }),
  );
}
