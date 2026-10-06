import { sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { users } from "@/db/schema";
import { setSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const signupSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or less")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and dashes",
    ),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  displayName: z.string().trim().max(50).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const { username, password, displayName } = parsed.data;
    const normalizedUsername = username.toLowerCase();

    // Check if username already exists (case-insensitive)
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(sql`lower(${users.username}) = ${normalizedUsername}`)
      .limit(1);

    if (existing) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const finalDisplayName = displayName?.trim() || username;
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${normalizedUsername}`;

    const [newUser] = await db
      .insert(users)
      .values({
        username: normalizedUsername,
        displayName: finalDisplayName,
        passwordHash,
        avatarUrl,
      })
      .returning({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      });

    await setSessionUser(newUser.id);

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
  }
}
