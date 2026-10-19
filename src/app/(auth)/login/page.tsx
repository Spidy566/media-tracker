import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { LoginClient } from "./login-client";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const { next } = await searchParams;

  if (user) {
    const target = next?.startsWith("/") && !next.startsWith("//") ? next : "/";
    redirect(target);
  }

  return (
    <Suspense
      fallback={
        <div className="w-full max-w-md h-96 rounded-3xl bg-card/50 border border-border animate-pulse" />
      }
    >
      <LoginClient />
    </Suspense>
  );
}
