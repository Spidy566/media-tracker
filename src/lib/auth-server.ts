import crypto from "node:crypto";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import * as schema from "@/db/schema";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { hashPassword, verifyPassword } from "@/lib/password";

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      ...schema,
      user: schema.users,
    },
  }),
  user: {
    modelName: "users",
    fields: {
      name: "displayName",
      image: "avatarUrl",
    },
    deleteUser: {
      enabled: true,
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 72,
    autoSignIn: true,
    password: {
      hash: async (password: string) => hashPassword(password),
      verify: async ({ hash, password }: { hash: string; password: string }) =>
        verifyPassword(password, hash),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
    cookieCache: {
      enabled: false,
    },
  },
  rateLimit: {
    enabled: true,
    storage: "database",
    modelName: "rateLimit",
    customRules: {
      "/sign-in/username": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 3 },
      "/change-password": { window: 60, max: 3 },
    },
  },
  advanced: {
    database: {
      generateId: "uuid",
    },
    cookiePrefix: "tracklist",
    useSecureCookies: env.NODE_ENV === "production",
    ipAddress: {
      ipAddressHeaders: ["x-real-ip", "x-forwarded-for"],
    },
  },
  trustedOrigins: [env.BETTER_AUTH_URL],
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const u = (user as { username?: string }).username || user.name || "user";
          return {
            data: {
              ...user,
              image:
                user.image ||
                `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(
                  String(u).toLowerCase(),
                )}`,
            },
          };
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      // 1. Strictly forbid email login
      if (ctx.path === "/sign-in/email") {
        throw new APIError("FORBIDDEN", {
          message: "Email sign-in is disabled. Use your username.",
        });
      }

      // 2. Intercept sign-up and check invite code with constant-time equality
      if (ctx.path === "/sign-up/email") {
        const inviteCode = ctx.body?.inviteCode;
        if (
          typeof inviteCode !== "string" ||
          !timingSafeEqualStr(inviteCode.trim(), env.SQUAD_INVITE_CODE.trim())
        ) {
          throw new APIError("FORBIDDEN", {
            message: "Invalid squad invite code",
          });
        }
        delete ctx.body.inviteCode;
      }
    }),
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
      usernameValidator: (val) => /^[a-zA-Z0-9_-]+$/.test(val),
      usernameNormalization: (val) => val.toLowerCase(),
      displayUsername: false,
    }),
    nextCookies(),
  ],
});
