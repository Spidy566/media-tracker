import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { cache } from "react";
import { auth } from "@/lib/auth-server";
import { env } from "@/lib/env";

export type CurrentUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: Date;
};

// 1. Get the currently logged-in user from Better Auth session
export const getCurrentUser = cache(
  async (customHeaders?: Headers): Promise<CurrentUser | null> => {
    try {
      const h = customHeaders || (await headers());
      const session = await auth.api.getSession({
        headers: h,
      });

      if (!session?.user) {
        return null;
      }

      const username =
        (session.user as { username?: string }).username || session.user.name || "user";
      const displayName = session.user.name || username;
      const avatarUrl = session.user.image || null;

      return {
        id: session.user.id,
        username,
        displayName,
        avatarUrl,
        createdAt: new Date(session.user.createdAt),
      };
    } catch (err: unknown) {
      if ((err as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") {
        throw err;
      }
      console.error("getCurrentUser error:", err);
      return null;
    }
  },
);

// 2. Require authenticated user in API routes (returns user or 401 NextResponse)
export async function requireUser(
  req?: { headers: Headers } | Headers,
): Promise<CurrentUser | NextResponse> {
  const h = req instanceof Headers ? req : req?.headers;
  const user = await getCurrentUser(h);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return user;
}

// 3. Admin authorization check (server-side only)
export function isAdmin(user: { username: string } | null | undefined): boolean {
  if (!user?.username) return false;
  const adminList = env.ADMIN_USERNAMES.split(",").map((u) => u.trim().toLowerCase());
  return adminList.includes(user.username.toLowerCase());
}
