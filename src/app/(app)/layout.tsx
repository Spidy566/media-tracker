import { redirect } from "next/navigation";
import { Suspense } from "react";
import { DiscoverProvider } from "@/components/discover/discover-context";
import { NavBar } from "@/components/nav-bar";
import { SearchProvider } from "@/components/navbar/search-context";
import { getCurrentUser, isAdmin } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const userIsAdmin = isAdmin(user);

  return (
    <DiscoverProvider>
      <SearchProvider>
        <Suspense fallback={<div className="h-20 bg-[#1a1a1a]" />}>
          <NavBar user={user} isAdmin={userIsAdmin} />
        </Suspense>
        <div className="pt-20 pb-20 md:pb-0 min-h-screen flex flex-col">{children}</div>
      </SearchProvider>
    </DiscoverProvider>
  );
}
