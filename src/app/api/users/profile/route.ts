import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name must be at least 1 character")
    .max(50, "Display name cannot exceed 50 characters"),
});

export async function PATCH(request: NextRequest) {
  const authResult = await requireUser(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const currentUser = authResult;

  try {
    const json = await request.json();
    const result = profileSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || "Invalid input" },
        { status: 400 },
      );
    }

    const [updatedUser] = await db
      .update(users)
      .set({ displayName: result.data.displayName })
      .where(eq(users.id, currentUser.id))
      .returning({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      });

    return NextResponse.json({ user: updatedUser });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
