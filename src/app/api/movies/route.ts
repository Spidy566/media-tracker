import { NextRequest } from "next/server";
import { movies } from "@/db/schema";
import { addMovieSchema } from "@/lib/validations/movie";
import { listAll, createOne } from "@/lib/api/crud";

export async function POST(request: NextRequest) {
  const body = await request.json();
  return createOne(movies, addMovieSchema, body, "Movie already in your library", (data) => ({
    ...data,
    releaseDate: data.releaseDate ? new Date(data.releaseDate) : null,
  }));
}

export async function GET() {
  return listAll(movies, movies.createdAt);
}