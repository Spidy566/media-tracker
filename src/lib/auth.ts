import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { users } from "@/db/schema";
import { db } from "@/lib/db";

const SESSION_COOKIE_NAME = "tracklist_session";
// Fallback cookie name for seamless backward compatibility during development
const LEGACY_COOKIE_NAME = "tracklist_user_id";

const AUTH_SECRET = process.env.AUTH_SECRET || "tracklist-dev-secret-key-replace-in-prod";

async function signValue(value: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return Buffer.from(signature).toString("base64url");
}

async function verifyValue(value: string, signature: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(AUTH_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const sigBuf = Buffer.from(signature, "base64url");
    return await crypto.subtle.verify("HMAC", key, sigBuf, encoder.encode(value));
  } catch {
    return false;
  }
}

// 1. Get the currently logged-in user from the secure signed cookie
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  let userId: string | null = null;

  if (sessionToken) {
    const parts = sessionToken.split(".");
    if (parts.length === 2) {
      const [rawId, sig] = parts;
      const isValid = await verifyValue(rawId, sig);
      if (isValid) {
        userId = rawId;
      }
    }
  }

  // Fallback to legacy dev cookie if session cookie is not set
  if (!userId) {
    userId = cookieStore.get(LEGACY_COOKIE_NAME)?.value || null;
  }

  if (!userId) {
    return null;
  }

  // Look up user in DB (excluding passwordHash for security)
  const [user] = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user || null;
}

// 2. Set the signed session cookie
export async function setSessionUser(userId: string) {
  const cookieStore = await cookies();
  const signature = await signValue(userId);
  const token = `${userId}.${signature}`;

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  // Clean up legacy cookie if present
  cookieStore.delete(LEGACY_COOKIE_NAME);
}

// 3. Clear session cookie (Log out)
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  cookieStore.delete(LEGACY_COOKIE_NAME);
}
