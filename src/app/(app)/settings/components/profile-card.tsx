"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface ProfileCardProps {
  user: CurrentUser;
}

export function ProfileCard({ user }: ProfileCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(user.displayName);
  const [isPublic, setIsPublic] = useState(user.isPublic ?? true);

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
    onSuccess: () => {
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

  const { mutate: updatePrivacy, isPending: isUpdatingPrivacy } = useMutation({
    mutationFn: async (newIsPublic: boolean) => {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: newIsPublic }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update privacy");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const updated = data?.user?.isPublic ?? !isPublic;
      setIsPublic(updated);
      toast.success(updated ? "Profile is now public" : "Profile is now private");
      queryClient.invalidateQueries({ queryKey: ["user"] });
      router.refresh();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <section className="p-6 rounded-2xl bg-card border border-border shadow-xs space-y-4">
      <div>
        <h2 className="text-base font-bold text-foreground font-sans">Profile</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Your personal public profile details.</p>
      </div>

      <form onSubmit={handleNameSubmit} className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label
            htmlFor="displayName"
            className="text-xs font-semibold text-foreground uppercase tracking-wider block font-mono"
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
          <p className="text-[11px] text-muted-foreground font-mono">@{user.username}</p>
        </div>
      </form>

      <div className="pt-4 border-t border-border flex items-center justify-between">
        <div className="space-y-0.5">
          <span className="text-sm font-semibold text-foreground block font-sans">Public Profile</span>
          <span className="text-xs text-muted-foreground block">
            Allow other members to see your Library and currently watching/playing items
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isPublic}
          disabled={isUpdatingPrivacy}
          onClick={() => updatePrivacy(!isPublic)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50",
            isPublic ? "bg-brand" : "bg-muted",
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block size-5 transform rounded-full bg-card shadow-xs ring-0 transition duration-200 ease-in-out",
              isPublic
                ? "translate-x-5 bg-brand-foreground"
                : "translate-x-0 bg-muted-foreground",
            )}
          />
        </button>
      </div>
    </section>
  );
}
