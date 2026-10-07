"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, LogIn, User, UserPlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "signup";
}

export function AuthModal({ isOpen, onClose, defaultTab = "login" }: AuthModalProps) {
  const [tab, setTab] = useState<"login" | "signup">(defaultTab);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const router = useRouter();

  // Reset form when opening
  useEffect(() => {
    if (isOpen) {
      setTab(defaultTab);
      setErrorMessage(null);
    }
  }, [isOpen, defaultTab]);

  const handleTabChange = (nextTab: "login" | "signup") => {
    setTab(nextTab);
    setErrorMessage(null);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  const { mutate: login, isPending: isLoggingIn } = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to log in");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["session-user"] });
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      router.refresh();
      toast.success(`Welcome back, ${data.user.displayName}!`);
      onClose();
    },
    onError: (err: Error) => {
      setErrorMessage(err.message);
    },
  });

  const { mutate: signup, isPending: isSigningUp } = useMutation({
    mutationFn: async () => {
      setErrorMessage(null);
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create account");
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["session-user"] });
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      router.refresh();
      toast.success(`Account created! Welcome, ${data.user.displayName}!`);
      onClose();
    },
    onError: (err: Error) => {
      setErrorMessage(err.message);
    },
  });

  if (!isOpen) return null;

  const isPending = isLoggingIn || isSigningUp;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tab === "login") {
      login();
    } else {
      signup();
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close authentication modal"
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm cursor-default border-0"
      />

      {/* Modal Dialog */}
      <div className="relative z-10 bg-card text-card-foreground border border-border w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col p-6 animate-in fade-in-50 zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-foreground text-background flex items-center justify-center font-black">
              {tab === "login" ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
            </div>
            <h2 className="text-lg font-bold text-foreground">
              {tab === "login" ? "Sign In to Tracklist" : "Create Your Account"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-muted/60 rounded-xl mt-4 border border-border">
          <button
            type="button"
            onClick={() => handleTabChange("login")}
            className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              tab === "login"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("signup")}
            className={`py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              tab === "signup"
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mt-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label
              htmlFor="auth-username"
              className="text-xs font-semibold text-muted-foreground block mb-1.5"
            >
              Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. spidy"
                className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition"
              />
            </div>
          </div>

          {tab === "signup" && (
            <div>
              <label
                htmlFor="auth-display-name"
                className="text-xs font-semibold text-muted-foreground block mb-1.5"
              >
                Display Name{" "}
                <span className="text-[10px] text-muted-foreground/70 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="auth-display-name"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. Spider-Man"
                  className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition"
                />
              </div>
            </div>
          )}

          <div>
            <label
              htmlFor="auth-password"
              className="text-xs font-semibold text-muted-foreground block mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="auth-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={tab === "signup" ? "At least 6 characters" : "Enter password"}
                className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full mt-2 py-2.5 rounded-xl bg-foreground text-background font-bold text-sm hover:opacity-90 transition cursor-pointer disabled:opacity-50"
          >
            {isPending ? "Please wait..." : tab === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Demo Accounts Tip */}
        <div className="mt-5 p-2.5 rounded-xl bg-muted/40 border border-border/60 text-[11px] text-muted-foreground leading-relaxed text-center">
          💡 Demo accounts: <span className="font-mono text-foreground font-semibold">spidy</span>,{" "}
          <span className="font-mono text-foreground font-semibold">dave</span>, or{" "}
          <span className="font-mono text-foreground font-semibold">alex</span> (password:{" "}
          <span className="font-mono text-foreground font-semibold">password123</span>)
        </div>
      </div>
    </div>
  );
}
