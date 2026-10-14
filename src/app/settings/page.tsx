import type { Metadata } from "next";
import { SettingsClient } from "@/app/settings/settings-client";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Settings - Tracklist",
  description: "Manage your preferences and profile.",
};

export default async function SettingsPage() {
  const currentUser = await getCurrentUser();

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Customize your experience, appearance, and profile.
        </p>
      </div>

      <SettingsClient initialUser={currentUser} />
    </main>
  );
}
