import { redirect } from "next/navigation";
import { Suspense } from "react";
import { NavBar } from "@/components/nav-bar";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const userIsAdmin = isAdmin(user);

  return (
    <>
      <Suspense fallback={<div className="h-16 bg-background/80" />}>
        <NavBar user={user} isAdmin={userIsAdmin} />
      </Suspense>
      {children}
    </>
  );
}
