import { eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { users } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

const profileSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Display name must be at least 1 character")
      .max(50, "Display name cannot exceed 50 characters")
      .optional(),
    isPublic: z.boolean().optional(),
  })
  .refine(
    (data) => data.displayName !== undefined || data.isPublic !== undefined,
    "At least one field must be provided",
  );

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

    const updatePayload: { displayName?: string; isPublic?: boolean; updatedAt: Date } = {
      updatedAt: new Date(),
    };
    if (result.data.displayName !== undefined) {
      updatePayload.displayName = result.data.displayName;
    }
    if (result.data.isPublic !== undefined) {
      updatePayload.isPublic = result.data.isPublic;
    }

    const [updatedUser] = await db
      .update(users)
      .set(updatePayload)
      .where(eq(users.id, currentUser.id))
      .returning({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
        isPublic: users.isPublic,
      });

    return NextResponse.json({ user: updatedUser });
  } catch {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
