import { NextRequest } from "next/server";
import { movies } from "@/db/schema";
import { getById, updateById, deleteById } from "@/lib/api/crud";
import { z } from "zod";

const updateMovieSchema = z.object({
  status: z.enum(["PLAN_TO_WATCH", "WATCHING", "COMPLETED", "DROPPED", "ON_HOLD"]).optional(),
  rating: z.number().min(1).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return getById(movies, movies.id, id);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return updateById(movies, movies.id, updateMovieSchema, id, body);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return deleteById(movies, movies.id, id);
}