"use client";

import {
  AlertTriangle,
  Check,
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CurrentUser } from "@/lib/auth";

export interface SquadMember {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface AdminClientProps {
  currentUser: CurrentUser;
  initialMembers: SquadMember[];
}

export function AdminClient({ currentUser, initialMembers }: AdminClientProps) {
  const router = useRouter();
  const [members, setMembers] = useState<SquadMember[]>(initialMembers);

  // Reset password states
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [tempPasswordResult, setTempPasswordResult] = useState<{
    username: string;
    tempPassword: string;
  } | null>(null);
  const [hasCopied, setHasCopied] = useState(false);

  // Remove member states
  const [removingMember, setRemovingMember] = useState<SquadMember | null>(null);
  const [removeConfirmUsername, setRemoveConfirmUsername] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);

  const handleResetPassword = async (member: SquadMember) => {
    setResettingUserId(member.id);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId: member.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setTempPasswordResult({
        username: member.username,
        tempPassword: data.temporaryPassword,
      });
      setHasCopied(false);
      toast.success(`Temporary password generated for @${member.username}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to reset password";
      toast.error(message);
    } finally {
      setResettingUserId(null);
    }
  };

  const handleCopyPassword = () => {
    if (!tempPasswordResult) return;
    navigator.clipboard.writeText(tempPasswordResult.tempPassword);
    setHasCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setHasCopied(false), 2000);
  };

  const handleRemoveMember = async () => {
    if (!removingMember) return;

    if (removeConfirmUsername.trim().toLowerCase() !== removingMember.username.toLowerCase()) {
      toast.error("Username does not match");
      return;
    }

    setIsRemoving(true);
    try {
      const res = await fetch("/api/admin/remove-member", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: removingMember.id,
          confirmUsername: removeConfirmUsername.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to remove member");
      }

      toast.success(`@${removingMember.username} has been removed from the squad`);
      setMembers((prev) => prev.filter((m) => m.id !== removingMember.id));
      setRemovingMember(null);
      setRemoveConfirmUsername("");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to remove member";
      toast.error(message);
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-6 text-brand" />
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Squad Administration
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage squad members, reset passwords, and oversee account access.
          </p>
        </div>
      </div>

      {/* Temporary Password Modal / Dialog */}
      {tempPasswordResult && (
        <div className="p-6 rounded-2xl bg-card border-2 border-brand/40 shadow-xl space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-brand font-bold text-sm">
              <KeyRound className="size-4.5" />
              <span>Temporary Password Generated</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setTempPasswordResult(null)}
              className="text-xs h-7 cursor-pointer"
            >
              Dismiss
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            A temporary password has been created for{" "}
            <strong className="text-foreground">@{tempPasswordResult.username}</strong> and all of
            their active sessions have been revoked. Share this password with them:
          </p>

          <div className="flex items-center gap-2 bg-muted p-3 rounded-xl border border-border">
            <span className="font-mono text-base font-bold text-brand tracking-wider flex-1 select-all">
              {tempPasswordResult.tempPassword}
            </span>
            <Button
              type="button"
              size="sm"
              onClick={handleCopyPassword}
              className="h-8 px-3 rounded-lg text-xs font-semibold bg-brand text-brand-foreground hover:opacity-90 cursor-pointer shrink-0"
            >
              {hasCopied ? (
                <>
                  <Check className="size-3.5 mr-1" /> Copied
                </>
              ) : (
                <>
                  <Copy className="size-3.5 mr-1" /> Copy
                </>
              )}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground/80">
            ⚠️ This password will not be shown again. The member should sign in and update their
            password immediately.
          </p>
        </div>
      )}

      {/* Remove Member Confirmation Panel */}
      {removingMember && (
        <div className="p-6 rounded-2xl bg-destructive/10 border border-destructive/30 shadow-xl space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2 text-destructive font-bold text-sm">
            <AlertTriangle className="size-5 shrink-0" />
            <span>Remove Member @{removingMember.username}</span>
          </div>

          <p className="text-xs text-muted-foreground">
            This will permanently delete{" "}
            <strong className="text-foreground">{removingMember.displayName}</strong>, revoke all
            their sessions, and cascade delete all their review notes and media entries.
          </p>

          <div className="space-y-2">
            <label
              htmlFor="remove-confirm-input"
              className="text-xs font-medium text-foreground block"
            >
              Type{" "}
              <span className="font-mono font-bold text-destructive">
                {removingMember.username}
              </span>{" "}
              to confirm:
            </label>
            <div className="flex gap-2 max-w-md">
              <Input
                id="remove-confirm-input"
                value={removeConfirmUsername}
                onChange={(e) => setRemoveConfirmUsername(e.target.value)}
                placeholder={removingMember.username}
                className="rounded-xl text-xs bg-card"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemoveMember}
                disabled={
                  isRemoving ||
                  removeConfirmUsername.trim().toLowerCase() !==
                    removingMember.username.toLowerCase()
                }
                className="rounded-xl text-xs font-bold shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isRemoving ? <Loader2 className="size-3.5 animate-spin" /> : "Confirm Removal"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRemovingMember(null);
                  setRemoveConfirmUsername("");
                }}
                className="rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Squad Members List */}
      <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">
              Squad Members ({members.length})
            </h2>
          </div>
        </div>

        <div className="divide-y divide-border/60">
          {members.map((member) => {
            const isSelf = member.id === currentUser.id;
            const joinedDate = new Date(member.createdAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            return (
              <div
                key={member.id}
                className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="size-10 rounded-full bg-muted border border-border flex items-center justify-center text-sm font-semibold text-foreground shrink-0 shadow-xs">
                    {member.displayName[0]?.toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {member.displayName}
                      </span>
                      {isSelf && (
                        <span className="px-2 py-0.5 rounded-full bg-brand/15 text-brand text-[10px] font-bold">
                          You (Admin)
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground block truncate">
                      @{member.username} · Joined {joinedDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleResetPassword(member)}
                    disabled={resettingUserId === member.id}
                    className="rounded-xl text-xs font-medium border-border hover:bg-muted cursor-pointer"
                  >
                    {resettingUserId === member.id ? (
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                    ) : (
                      <KeyRound className="size-3.5 mr-1.5 text-muted-foreground" />
                    )}
                    Reset Password
                  </Button>

                  {!isSelf && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setRemovingMember(member);
                        setRemoveConfirmUsername("");
                      }}
                      className="rounded-xl text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    >
                      <Trash2 className="size-3.5 mr-1.5" />
                      Remove
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
