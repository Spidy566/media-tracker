import { NextResponse } from "next/server";
import { users } from "@/db/schema";
import { db } from "@/lib/db";

export async function GET() {
  const squad = await db.select().from(users).orderBy(users.displayName);
  return NextResponse.json({ users: squad });
}
