"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, EyeOff, Loader2, LogIn, LogOut, Moon, Sun, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { usePosters } from "@/components/providers/poster-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useActiveUser } from "@/hooks/use-active-user";
import { AUTH_MODAL_EVENT } from "@/lib/auth-events";

interface SettingsClientProps {
  initialUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
}

export function SettingsClient({ initialUser }: SettingsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { hidePosters, togglePosters } = usePosters();
  const { currentUser: activeUser, logout, isLoggingOut } = useActiveUser();

  const user = activeUser ?? initialUser;

  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || "");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user?.displayName) {
      setDisplayName(user.displayName);
    }
  }, [user?.displayName]);

  // Profile update mutation
  const { mutate: updateProfile, isPending: isUpdatingName } = useMutation({
    mutationFn: async (newName: string) => {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: newName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }
      return data.user;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["session-user"], { user: updated });
      queryClient.invalidateQueries({ queryKey: ["session-user"] });
      toast.success("Display name updated");
      router.refresh();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) {
      toast.error("Display name cannot be empty");
      return;
    }
    if (trimmed.length > 50) {
      toast.error("Display name cannot exceed 50 characters");
      return;
    }
    updateProfile(trimmed);
  };

  const isDark = mounted && theme === "dark";

  return (
    <div className="space-y-6">
      {/* 1. Appearance / Theme */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Appearance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Switch between light and dark themes.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground">
              {isDark ? (
                <Moon className="w-4 h-4 text-brand-text" />
              ) : (
                <Sun className="w-4 h-4 text-brand-text" />
              )}
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground block">Color Mode</span>
              <span className="text-xs text-muted-foreground">
                Currently {isDark ? "Dark mode" : "Light mode"}
              </span>
            </div>
          </div>

          <div className="flex items-center bg-muted p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setTheme("light")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                mounted && theme === "light"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                mounted && theme === "dark"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>Dark</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Poster Visibility Default (Stealth Mode) */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Media Display</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Toggle poster art visibility across all catalog grids.
          </p>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground">
              {hidePosters ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </div>
            <div>
              <span className="text-sm font-semibold text-foreground block">
                Hide Posters (Stealth Mode)
              </span>
              <span className="text-xs text-muted-foreground">
                {hidePosters
                  ? "Posters are hidden; text placeholders shown"
                  : "Posters and backdrop artwork are visible"}
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant={hidePosters ? "default" : "outline"}
            size="sm"
            onClick={togglePosters}
            className="rounded-xl text-xs font-semibold"
          >
            {hidePosters ? "Stealth: ON" : "Stealth: OFF"}
          </Button>
        </div>
      </section>

      {/* 3. Display Name Edit */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Profile</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your public display name shown to squad members.
          </p>
        </div>

        {user ? (
          <form onSubmit={handleNameSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label
                htmlFor="displayName"
                className="text-xs font-semibold text-foreground uppercase tracking-wider block"
              >
                Display Name
              </label>
              <div className="flex gap-2">
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={50}
                  className="rounded-xl text-sm"
                />
                <Button
                  type="submit"
                  disabled={
                    isUpdatingName || !displayName.trim() || displayName.trim() === user.displayName
                  }
                  className="rounded-xl px-4 shrink-0 text-xs font-bold bg-brand text-brand-foreground hover:opacity-90 cursor-pointer"
                >
                  {isUpdatingName ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Save
                    </>
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">@{user.username}</p>
            </div>
          </form>
        ) : (
          <div className="pt-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                <User className="w-4 h-4" />
              </div>
              <span className="text-xs text-muted-foreground">
                You are currently logged out. Log in to personalize your profile.
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => window.dispatchEvent(new CustomEvent(AUTH_MODAL_EVENT))}
              className="rounded-xl text-xs font-semibold bg-brand text-brand-foreground hover:opacity-90 cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 mr-1" />
              Log In
            </Button>
          </div>
        )}
      </section>

      {/* 4. Session / Log Out */}
      {user && (
        <section className="p-6 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-foreground">Account Session</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Signed in as <span className="font-semibold text-foreground">{user.displayName}</span>
            </p>
          </div>

          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => logout()}
            disabled={isLoggingOut}
            className="rounded-xl text-xs font-semibold"
          >
            {isLoggingOut ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
            ) : (
              <LogOut className="w-3.5 h-3.5 mr-1" />
            )}
            Log Out
          </Button>
        </section>
      )}
    </div>
  );
}
