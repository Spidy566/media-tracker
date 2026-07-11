import { NextRequest } from "next/server";
import { games } from "@/db/schema";
import { addGameSchema } from "@/lib/validations/game";
import { listAll, createOne } from "@/lib/api/crud";

export async function POST(request: NextRequest) {
  const body = await request.json();
  return createOne(games, addGameSchema, body, "Game already in your library", (data) => ({
    ...data,
    releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
  }));
}

export async function GET() {
  return listAll(games, games.createdAt);
}