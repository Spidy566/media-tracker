import { asc } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { users } from "@/db/schema";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminClient, type SquadMember } from "./admin-client";

export const metadata: Metadata = {
  title: "Admin · Tracklist",
  description: "Squad member and access management.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser || !isAdmin(currentUser)) {
    notFound();
  }

  const rawMembers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(asc(users.createdAt));

  const members: SquadMember[] = rawMembers.map((m) => ({
    ...m,
    createdAt: m.createdAt.toISOString(),
  }));

  return <AdminClient currentUser={currentUser} initialMembers={members} />;
}
