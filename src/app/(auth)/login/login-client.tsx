"use client";

import { Eye, EyeOff, Film, KeyRound, Lock, LogIn, User, UserPlus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const nextParam = searchParams.get("next");
  const targetUrl = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form states
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      setErrorMessage("Please enter both username and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authClient.signIn.username({
        username: cleanUsername,
        password,
      });

      if (res.error) {
        if (res.error.status === 429) {
          setErrorMessage("Too many attempts. Please try again in a few moments.");
        } else {
          setErrorMessage(res.error.message || "Invalid username or password.");
        }
        setIsSubmitting(false);
        return;
      }

      router.replace(targetUrl);
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      if (errorObj?.status === 429) {
        setErrorMessage("Too many attempts. Please try again in a few moments.");
      } else {
        setErrorMessage("Sign-in failed. Please check your credentials.");
      }
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim();
    const cleanInvite = inviteCode.trim();

    if (!cleanUsername || !cleanDisplayName || !password || !cleanInvite) {
      setErrorMessage("Please fill in all required fields.");
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const signUpFn = authClient.signUp.email as (data: {
        email: string;
        password: string;
        name: string;
        username: string;
        inviteCode: string;
      }) => Promise<{ error?: { status?: number; message?: string } }>;

      const res = await signUpFn({
        email: `${cleanUsername}@tracklist.invalid`,
        password,
        name: cleanDisplayName,
        username: cleanUsername,
        inviteCode: cleanInvite,
      });

      if (res.error) {
        if (res.error.status === 429) {
          setErrorMessage("Too many attempts. Please try again in a few moments.");
        } else if (res.error.status === 403 || res.error.message?.includes("invite code")) {
          setErrorMessage("Invalid squad invite code.");
        } else {
          setErrorMessage(res.error.message || "Sign-up failed.");
        }
        setIsSubmitting(false);
        return;
      }

      router.replace(targetUrl);
      router.refresh();
    } catch (err: unknown) {
      const errorObj = err as { status?: number; message?: string };
      if (errorObj?.status === 429) {
        setErrorMessage("Too many attempts. Please try again in a few moments.");
      } else if (errorObj?.status === 403 || errorObj?.message?.includes("invite code")) {
        setErrorMessage("Invalid squad invite code.");
      } else {
        setErrorMessage(errorObj?.message || "Sign-up failed.");
      }
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-3xl bg-card border border-border p-6 sm:p-8 shadow-2xl flex flex-col gap-6">
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center gap-2">
        <div className="flex aspect-square size-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-xs">
          <Film className="size-6 stroke-[2.5]" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Tracklist</h1>
        <p className="text-xs text-muted-foreground">
          {mode === "signin"
            ? "Sign in to access your squad library and tracker"
            : "Enter your squad invite code to join"}
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 p-1 rounded-xl bg-muted border border-border text-xs font-semibold">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setErrorMessage(null);
          }}
          className={cn(
            "py-2 rounded-lg transition cursor-pointer",
            mode === "signin"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setErrorMessage(null);
          }}
          className={cn(
            "py-2 rounded-lg transition cursor-pointer",
            mode === "signup"
              ? "bg-card text-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Join the squad
        </button>
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium">
          {errorMessage}
        </div>
      )}

      {/* Forms */}
      {mode === "signin" ? (
        <form onSubmit={handleSignIn} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signin-username"
              className="text-xs font-medium text-foreground tracking-wide"
            >
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="signin-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your username"
                className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signin-password"
              className="text-xs font-medium text-foreground tracking-wide"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="signin-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-10 pr-10 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 mt-2 rounded-xl bg-foreground text-background font-semibold text-xs tracking-wide hover:opacity-90 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
          >
            <LogIn className="size-4" />
            <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setUsername("spidy");
              setPassword("password123");
              setErrorMessage(null);
            }}
            className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border text-xs text-muted-foreground transition cursor-pointer text-left"
          >
            <span>
              Portfolio Demo: username <code className="font-mono font-semibold text-foreground">spidy</code> · password <code className="font-mono font-semibold text-foreground">password123</code>
            </span>
            <span className="shrink-0 font-medium text-[11px] text-foreground bg-card px-2.5 py-1 rounded-lg border border-border transition shadow-xs">
              Fill Demo Credentials
            </span>
          </button>
        </form>
      ) : (
        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signup-username"
              className="text-xs font-medium text-foreground tracking-wide"
            >
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="signup-username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="lowercase letters & numbers"
                className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signup-displayname"
              className="text-xs font-medium text-foreground tracking-wide"
            >
              Display Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="signup-displayname"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your Squad Nickname"
                className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signup-password"
              className="text-xs font-medium text-foreground tracking-wide"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="signup-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="at least 8 characters"
                className="w-full h-10 pl-10 pr-10 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="signup-invite"
              className="text-xs font-medium text-foreground tracking-wide"
            >
              Squad Invite Code
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="signup-invite"
                type="password"
                autoComplete="off"
                required
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                placeholder="Secret invite code"
                className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 mt-2 rounded-xl bg-brand text-brand-foreground font-semibold text-xs tracking-wide hover:opacity-90 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
          >
            <UserPlus className="size-4" />
            <span>{isSubmitting ? "Creating account..." : "Join the squad"}</span>
          </button>
        </form>
      )}
    </div>
  );
}
