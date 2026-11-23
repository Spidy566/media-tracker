"use client";

import { AlertTriangle, Loader2, LogOut, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CurrentUser } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";

interface DangerZoneCardProps {
  user: CurrentUser;
}

export function DangerZoneCard({ user }: DangerZoneCardProps) {
  const router = useRouter();

  // Delete account state
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Logout state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmation.trim() !== user.username) {
      toast.error("Username does not match");
      return;
    }

    setIsDeletingAccount(true);
    try {
      const res = await fetch("/api/users/profile", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete account");
      }

      await authClient.signOut();
      toast.success("Account deleted");
      router.replace("/login");
    } catch (err) {
      console.error("Failed to delete account:", err);
      toast.error("Failed to delete account");
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

  return (
    <div className="space-y-8">
      {/* Danger Zone */}
      <section className="p-6 rounded-2xl bg-card border border-destructive/20 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-bold text-destructive font-sans">Danger Zone</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Permanently delete your account and all tracked entries.
          </p>
        </div>

        {!showDeleteConfirm ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="rounded-xl text-xs font-semibold cursor-pointer"
          >
            <Trash2 className="size-3.5 mr-1.5" /> Delete Account
          </Button>
        ) : (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 space-y-3">
            <div className="flex items-center gap-2 text-destructive font-semibold text-xs">
              <AlertTriangle className="size-4 shrink-0" />
              <span>
                This action cannot be undone. All your media entries will be permanently deleted.
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              To confirm, type your username{" "}
              <span className="font-mono font-bold text-foreground">{user.username}</span> below:
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder={user.username}
                className="rounded-xl text-xs bg-card"
              />
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || deleteConfirmation.trim() !== user.username}
                  className="rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
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
          </div>
        )}
      </section>

      {/* Account Session / Sign Out */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-foreground font-sans">Account Session</h2>
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
