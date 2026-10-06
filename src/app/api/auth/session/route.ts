import { type NextRequest, NextResponse } from "next/server";
import { clearSession, getCurrentUser, setSessionUser } from "@/lib/auth";

// GET /api/auth/session -> Returns the currently authenticated user
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}

// POST /api/auth/session -> Logs in or switches the active user
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  await setSessionUser(userId);

  return NextResponse.json({ success: true });
}

// DELETE /api/auth/session -> Logs out
export async function DELETE() {
  await clearSession();
  return NextResponse.json({ success: true });
}
