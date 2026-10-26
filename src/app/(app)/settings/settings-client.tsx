"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bookmark,
  Check,
  Eye,
  EyeOff,
  Laptop,
  Loader2,
  Lock,
  LogOut,
  Moon,
  Play,
  Shield,
  Smartphone,
  Sun,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { usePosters } from "@/components/providers/poster-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CurrentUser } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { HOME_HIDDEN_COOKIE, type HomeSection } from "@/lib/home-prefs";
import { cn } from "@/lib/utils";

interface UserSessionItem {
  id?: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: string | Date;
}

interface SettingsClientProps {
  initialUser: CurrentUser;
  initialHiddenSections?: HomeSection[];
}

export function SettingsClient({ initialUser, initialHiddenSections = [] }: SettingsClientProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { theme, setTheme } = useTheme();
  const { hidePosters, togglePosters } = usePosters();

  const user = initialUser;

  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [hiddenSections, setHiddenSections] = useState<HomeSection[]>(initialHiddenSections);

  // Security card states
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [revokeOtherSessions, setRevokeOtherSessions] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Sessions state
  const [sessions, setSessions] = useState<UserSessionItem[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [revokingToken, setRevokingToken] = useState<string | null>(null);

  // Delete account state
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loadSessions = useCallback(async () => {
    setIsLoadingSessions(true);
    try {
      const res = await authClient.listSessions();
      if (res.data) {
        setSessions(res.data);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadSessions();
  }, [loadSessions]);

  const toggleSection = (id: HomeSection) => {
    const next = hiddenSections.includes(id)
      ? hiddenSections.filter((s) => s !== id)
      : [...hiddenSections, id];
    setHiddenSections(next);
    // biome-ignore lint/suspicious/noDocumentCookie: client-side cookie assignment for home hidden sections
    document.cookie = `${HOME_HIDDEN_COOKIE}=${next.join(",")}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };

  const { mutate: updateName, isPending: isUpdatingName } = useMutation({
    mutationFn: async (newName: string) => {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: newName }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: (_data) => {
      toast.success("Profile updated");
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["entries"] });
      router.refresh();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || displayName.trim() === user.displayName) return;
    updateName(displayName.trim());
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (!currentPassword || !newPassword) {
      setPasswordError("Please enter both current and new password.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions,
      });

      if (res.error) {
        setPasswordError(res.error.message || "Failed to change password.");
        setIsChangingPassword(false);
        return;
      }

      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      loadSessions();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to change password.";
      setPasswordError(message);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRevokeSession = async (token: string) => {
    setRevokingToken(token);
    try {
      const res = await authClient.revokeSession({ token });
      if (res.error) {
        toast.error(res.error.message || "Failed to revoke session");
      } else {
        toast.success("Session revoked");
        loadSessions();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to revoke session";
      toast.error(message);
    } finally {
      setRevokingToken(null);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.trim() !== user.username) {
      toast.error("Please type your username exactly to confirm deletion");
      return;
    }

    setIsDeletingAccount(true);
    try {
      const res = await authClient.deleteUser();
      if (res.error) {
        toast.error(res.error.message || "Failed to delete account");
        setIsDeletingAccount(false);
        return;
      }

      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete account";
      toast.error(message);
      setIsDeletingAccount(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await authClient.signOut();
      router.replace("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout failed:", err);
      setIsLoggingOut(false);
    }
  };

  const homeSectionsList: {
    id: HomeSection;
    label: string;
    description: string;
    icon: React.ReactNode;
  }[] = [
    {
      id: "jump",
      label: "Jump back in",
      description: "Quick access to titles you are currently watching or playing.",
      icon: <Play className="w-4 h-4 fill-current stroke-0" />,
    },
    {
      id: "queue",
      label: "Up next in queue",
      description: "Your prioritized personal queue of upcoming titles.",
      icon: <Bookmark className="w-4 h-4" />,
    },
    {
      id: "trending",
      label: "Trending",
      description: "Popular movies, TV series, and games across platforms.",
      icon: <TrendingUp className="w-4 h-4" />,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Manage your interface, account security, and active sessions.
        </p>
      </div>

      {/* 1. Appearance */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-6">
        <div>
          <h2 className="text-base font-bold text-foreground">Appearance</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Customize how Tracklist looks and behaves on this device.
          </p>
        </div>

        <div className="space-y-4">
          {/* Theme Switcher */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground block">Color Theme</span>
              <span className="text-xs text-muted-foreground block">
                Choose between dark and light appearance
              </span>
            </div>
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl border border-border">
              <Button
                variant={mounted && theme === "light" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTheme("light")}
                className="h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Sun className="w-3.5 h-3.5 mr-1.5" /> Light
              </Button>
              <Button
                variant={mounted && theme === "dark" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTheme("dark")}
                className="h-8 px-3 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Moon className="w-3.5 h-3.5 mr-1.5" /> Dark
              </Button>
            </div>
          </div>

          {/* Stealth Mode */}
          <div className="flex items-center justify-between pt-2 border-t border-border/60">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-foreground block">Stealth Mode</span>
              <span className="text-xs text-muted-foreground block">
                Hide cover posters and backdrops for discreet browsing
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={togglePosters}
              className="h-8 px-3 rounded-xl text-xs font-semibold border-border cursor-pointer"
            >
              {hidePosters ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 mr-1.5 text-brand" /> Posters Hidden
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /> Posters Shown
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* 2. Home Feed Customization */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Dashboard Sections</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choose which rows appear on your Home dashboard.
          </p>
        </div>

        <div className="divide-y divide-border/60">
          {homeSectionsList.map((sec) => {
            const isVisible = !hiddenSections.includes(sec.id);
            return (
              <div key={sec.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center text-foreground shrink-0">
                    {sec.icon}
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-foreground block">{sec.label}</span>
                    <span className="text-xs text-muted-foreground block truncate">
                      {sec.description}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={isVisible}
                  aria-label={`Toggle ${sec.label}`}
                  onClick={() => toggleSection(sec.id)}
                  className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    isVisible ? "bg-brand" : "bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block size-5 transform rounded-full bg-card shadow-xs ring-0 transition duration-200 ease-in-out",
                      isVisible
                        ? "translate-x-5 bg-brand-foreground"
                        : "translate-x-0 bg-muted-foreground",
                    )}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Profile Info */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Profile</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Your public display name.</p>
        </div>

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
                    <Check className="w-3.5 h-3.5 mr-1" /> Save
                  </>
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">@{user.username}</p>
          </div>
        </form>
      </section>

      {/* 4. Security Card */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="size-5 text-brand" />
            <h2 className="text-base font-bold text-foreground">Security</h2>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Update your password and review active devices signed into your account.
          </p>
        </div>

        {/* Change Password */}
        <form onSubmit={handleChangePassword} className="space-y-4 pt-2 border-t border-border/60">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Change Password
          </h3>

          {passwordError && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
              {passwordError}
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="currentPassword" className="text-xs font-medium text-foreground">
                Current Password
              </label>
              <Input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="rounded-xl text-sm"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="newPassword" className="text-xs font-medium text-foreground">
                  New Password
                </label>
                <Input
                  id="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="at least 8 chars"
                  className="rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="confirmPassword" className="text-xs font-medium text-foreground">
                  Confirm New Password
                </label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="rounded-xl text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="revokeOtherSessions"
                type="checkbox"
                checked={revokeOtherSessions}
                onChange={(e) => setRevokeOtherSessions(e.target.checked)}
                className="rounded border-border text-brand focus:ring-brand size-4 cursor-pointer"
              />
              <label
                htmlFor="revokeOtherSessions"
                className="text-xs text-foreground cursor-pointer"
              >
                Sign out of all other devices
              </label>
            </div>

            <Button
              type="submit"
              disabled={isChangingPassword || !currentPassword || !newPassword}
              size="sm"
              className="rounded-xl text-xs font-bold bg-foreground text-background hover:opacity-90 cursor-pointer disabled:opacity-50 mt-1"
            >
              {isChangingPassword ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Updating...
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 mr-1.5" /> Update Password
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Active Sessions */}
        <div className="space-y-3 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Active Sessions
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={loadSessions}
              disabled={isLoadingSessions}
              className="text-xs h-7 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              {isLoadingSessions ? <Loader2 className="size-3 animate-spin" /> : "Refresh"}
            </Button>
          </div>

          <div className="space-y-2">
            {sessions.map((sess, idx) => {
              const isCurrent = idx === 0; // Better Auth orders most recent / current session
              const isMobile = sess.userAgent?.toLowerCase().includes("mobile");

              return (
                <div
                  key={sess.id || sess.token}
                  className="p-3.5 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground shrink-0">
                      {isMobile ? <Smartphone className="size-4" /> : <Laptop className="size-4" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground truncate">
                          {sess.userAgent ? sess.userAgent.split(" ")[0] : "Browser Session"}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-brand/15 text-brand text-[10px] font-bold">
                            This device
                          </span>
                        )}
                      </div>
                      <span className="text-muted-foreground text-[11px] block truncate">
                        {sess.ipAddress ? `IP: ${sess.ipAddress} · ` : ""}
                        Expires {new Date(sess.expiresAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {!isCurrent && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleRevokeSession(sess.token)}
                      disabled={revokingToken === sess.token}
                      className="rounded-lg text-[11px] h-7 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 cursor-pointer"
                    >
                      {revokingToken === sess.token ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        "Revoke"
                      )}
                    </Button>
                  )}
                </div>
              );
            })}

            {sessions.length === 0 && !isLoadingSessions && (
              <p className="text-xs text-muted-foreground py-2">No active sessions found.</p>
            )}
          </div>
        </div>

        {/* Delete Account (Danger Zone) */}
        <div className="space-y-3 pt-4 border-t border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-destructive">
                Danger Zone
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Permanently delete your account and all tracked entries.
              </p>
            </div>
            {!showDeleteConfirm && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-xl text-xs font-semibold cursor-pointer"
              >
                <Trash2 className="size-3.5 mr-1.5" /> Delete Account
              </Button>
            )}
          </div>

          {showDeleteConfirm && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 space-y-3">
              <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
                <AlertTriangle className="size-4 shrink-0" />
                <span>This action cannot be undone. All your media entries will be deleted.</span>
              </div>
              <p className="text-xs text-muted-foreground">
                To confirm, type your username{" "}
                <span className="font-mono font-bold text-foreground">{user.username}</span> below:
              </p>
              <div className="flex gap-2">
                <Input
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder={user.username}
                  className="rounded-xl text-xs bg-card"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || deleteConfirmation.trim() !== user.username}
                  className="rounded-xl text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isDeletingAccount ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Confirm Delete"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmation("");
                  }}
                  className="rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 5. Account Session / Sign Out */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground">Account Session</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Signed in as <span className="font-semibold text-foreground">{user.displayName}</span>{" "}
            (@{user.username})
          </p>
        </div>

        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="rounded-xl text-xs font-semibold cursor-pointer"
        >
          {isLoggingOut ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
          ) : (
            <LogOut className="w-3.5 h-3.5 mr-1" />
          )}
          Log Out
        </Button>
      </section>
    </div>
  );
}
