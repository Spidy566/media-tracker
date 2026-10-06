import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { users } from "@/db/schema";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "tracklist_user_id";

// 1. Get the currently logged-in user from the secure cookie
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!userId) {
    return null;
  }

  // Look up the user in the database to make sure they still exist
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  return user || null;
}

// 2. Set the session cookie (Log a user in or switch user)
export async function setSessionUser(userId: string) {
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true, // Prevents JavaScript in the browser from stealing or altering this cookie
    secure: process.env.NODE_ENV === "production", // Only send over HTTPS in production
    sameSite: "lax", // Protects against CSRF (Cross-Site Request Forgery) attacks
    path: "/", // Available across the entire website
    maxAge: 60 * 60 * 24 * 30, // Valid for 30 days
  });
}

// 3. Clear the cookie (Log out)
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
