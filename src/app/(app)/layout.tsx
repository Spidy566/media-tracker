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
      <Suspense fallback={<div className="h-20 bg-background border-b border-border" />}>
        <NavBar user={user} isAdmin={userIsAdmin} />
      </Suspense>
      <div className="pt-20 pb-20 md:pb-0 min-h-screen flex flex-col">{children}</div>
    </>
  );
}
