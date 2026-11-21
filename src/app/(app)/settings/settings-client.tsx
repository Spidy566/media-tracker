"use client";

import type { CurrentUser } from "@/lib/auth";
import type { HomeSection } from "@/lib/home-prefs";
import { DangerZoneCard } from "./components/danger-zone-card";
import { PreferencesCard } from "./components/preferences-card";
import { ProfileCard } from "./components/profile-card";
import { SecurityCard } from "./components/security-card";

interface SettingsClientProps {
  initialUser: CurrentUser;
  initialHiddenSections?: HomeSection[];
}

export function SettingsClient({ initialUser, initialHiddenSections = [] }: SettingsClientProps) {
  return (
    <div className="space-y-8 max-w-4xl">
      {/* 1. Profile Information & Privacy */}
      <ProfileCard user={initialUser} />

      {/* 2. Appearance & Dashboard Preferences */}
      <PreferencesCard initialHiddenSections={initialHiddenSections} />

      {/* 3. Security & Active Sessions */}
      <SecurityCard />

      {/* 4. Danger Zone & Session Signout */}
      <DangerZoneCard user={initialUser} />
    </div>
  );
}
