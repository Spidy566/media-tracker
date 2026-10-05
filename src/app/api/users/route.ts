import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { users } from "@/db/schema";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get("username");

  if (username) {
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  }

  const squad = await db.select().from(users).orderBy(users.displayName);
  return NextResponse.json({ users: squad });
}
