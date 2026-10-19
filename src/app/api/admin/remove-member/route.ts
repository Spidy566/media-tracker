import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { account, session, users } from "@/db/schema";
import { isAdmin, requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const removeSchema = z.object({
  targetUserId: z.string().uuid("Invalid user ID"),
  confirmUsername: z.string().min(1, "Username confirmation is required"),
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
    const parsed = removeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { targetUserId, confirmUsername } = parsed.data;

    // Admin cannot remove themselves
    if (targetUserId === currentUser.id) {
      return NextResponse.json({ error: "An admin cannot remove themselves" }, { status: 400 });
    }

    const [targetUser] = await db
      .select({ id: users.id, username: users.username })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (confirmUsername.trim().toLowerCase() !== targetUser.username.toLowerCase()) {
      return NextResponse.json({ error: "Confirmation username does not match" }, { status: 400 });
    }

    // Delete user (cascades user_media_entries, account, session)
    await db.delete(account).where(eq(account.userId, targetUserId));
    await db.delete(session).where(eq(session.userId, targetUserId));
    await db.delete(users).where(eq(users.id, targetUserId));

    return NextResponse.json({
      success: true,
      removedUsername: targetUser.username,
    });
  } catch (error) {
    console.error("Admin remove member error:", error);
    return NextResponse.json({ error: "Failed to remove member" }, { status: 500 });
  }
}
