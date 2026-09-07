import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/db/schema";

export async function GET() {
  const squad = await db.select().from(users).orderBy(users.displayName);
  return NextResponse.json({ users: squad });
}