import { NextRequest } from "next/server";
import { games } from "@/db/schema";
import { getById, updateById, deleteById } from "@/lib/api/crud";
import { z } from "zod";

const updateGameSchema = z.object({
  status: z.enum(["PLAN_TO_PLAY", "PLAYING", "COMPLETED", "DROPPED", "ON_HOLD"]).optional(),
  rating: z.number().min(1).max(10).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return getById(games, games.id, id);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return updateById(games, games.id, updateGameSchema, id, body);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return deleteById(games, games.id, id);
}