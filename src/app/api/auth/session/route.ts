import { NextResponse } from "next/server";
import { clearSession, getCurrentUser } from "@/lib/auth";

// GET /api/auth/session -> Returns the currently authenticated user
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}

// DELETE /api/auth/session -> Logs out
export async function DELETE() {
  await clearSession();
  return NextResponse.json({ success: true });
}
