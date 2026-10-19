import crypto from "node:crypto";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { account, session, users } from "@/db/schema";
import { isAdmin, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

const resetSchema = z.object({
  targetUserId: z.string().uuid("Invalid user ID"),
});

export async function POST(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const currentUser = authResult;

  if (!isAdmin(currentUser)) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = resetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { targetUserId } = parsed.data;

    const [targetUser] = await db
      .select({ id: users.id, username: users.username, displayName: users.displayName })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 1. Generate random 16-character temporary password
    const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz!@#$";
    const bytes = crypto.randomBytes(16);
    let tempPassword = "";
    for (let i = 0; i < 16; i++) {
      tempPassword += chars[bytes[i] % chars.length];
    }

    // 2. Hash with identical bcrypt function
    const newHash = await hashPassword(tempPassword);

    // 3. Update credential account password
    await db
      .update(account)
      .set({ password: newHash })
      .where(and(eq(account.userId, targetUserId), eq(account.providerId, "credential")));

    // Keep users.passwordHash in sync
    await db.update(users).set({ passwordHash: newHash }).where(eq(users.id, targetUserId));

    // 4. Revoke that user's active sessions
    await db.delete(session).where(eq(session.userId, targetUserId));

    return NextResponse.json({
      success: true,
      username: targetUser.username,
      temporaryPassword: tempPassword,
    });
  } catch (error) {
    console.error("Admin password reset error:", error);
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
