"use client";

import { Laptop, Loader2, Lock, Shield, Smartphone } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

interface UserSessionItem {
  id?: string;
  token: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: string | Date;
}

export function SecurityCard() {
  // Password states
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
    loadSessions();
  }, [loadSessions]);

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
        setPasswordError(res.error.message || "Failed to update password.");
        return;
      }

      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      loadSessions();
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      setPasswordError(errorObj?.message || "Something went wrong.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleRevokeSession = async (token: string) => {
    setRevokingToken(token);
    try {
      await authClient.revokeSession({ token });
      toast.success("Session revoked");
      setSessions((prev) => prev.filter((s) => s.token !== token));
    } catch (err) {
      console.error("Failed to revoke session:", err);
      toast.error("Failed to revoke session");
    } finally {
      setRevokingToken(null);
    }
  };

  return (
    <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Shield className="size-5 text-brand" />
          <h2 className="text-base font-bold text-foreground font-sans">Security</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Update your password and review active devices signed into your account.
        </p>
      </div>

      {/* Change Password */}
      <form onSubmit={handleChangePassword} className="space-y-4 pt-2 border-t border-border/60">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
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
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground font-mono">
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
            const isCurrent = idx === 0;
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
                    <span className="text-muted-foreground text-[11px] block truncate font-mono">
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
    </section>
  );
}
