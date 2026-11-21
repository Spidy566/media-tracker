"use client";

import { Eye, EyeOff, Film, KeyRound, Lock, LogIn, User, UserPlus } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function LoginClient() {
  const searchParams = useSearchParams();

  const nextParam = searchParams.get("next");
  const targetUrl = nextParam?.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sign-in states
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Sign-up states
  const [signupUsername, setSignupUsername] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupInviteCode, setSignupInviteCode] = useState("");

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

      window.location.href = targetUrl;
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

    const cleanUsername = signupUsername.trim().toLowerCase();
    const cleanDisplayName = signupDisplayName.trim();
    const cleanPassword = signupPassword;
    const cleanInviteCode = signupInviteCode.trim();

    if (!cleanUsername || !cleanDisplayName || !cleanPassword || !cleanInviteCode) {
      setErrorMessage("Please fill in all fields including the invite code.");
      return;
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      setErrorMessage("Username must be between 3 and 30 characters.");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setErrorMessage("Username may only contain letters, numbers, hyphens, and underscores.");
      return;
    }

    if (cleanPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authClient.signUp.email({
        email: `${cleanUsername}@tracklist.local`,
        password: cleanPassword,
        name: cleanDisplayName,
        username: cleanUsername,
        inviteCode: cleanInviteCode,
      } as unknown as Parameters<typeof authClient.signUp.email>[0]);

      if (res.error) {
        if (res.error.message?.toLowerCase().includes("invite")) {
          setErrorMessage("Invalid invite code.");
        } else if (
          res.error.message?.toLowerCase().includes("unique") ||
          res.error.message?.toLowerCase().includes("already") ||
          res.error.message?.toLowerCase().includes("exist")
        ) {
          setErrorMessage("This username is already taken. Please choose another.");
        } else {
          setErrorMessage(res.error.message || "Sign-up failed. Please check your details.");
        }
        setIsSubmitting(false);
        return;
      }

      window.location.href = targetUrl;
    } catch (err: unknown) {
      const errorObj = err as { message?: string };
      if (errorObj?.message?.toLowerCase().includes("invite")) {
        setErrorMessage("Invalid invite code.");
      } else {
        setErrorMessage("Sign-up failed. Please check your credentials.");
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
            ? "Sign in to access your library and tracker"
            : "Enter your invite code to join Tracklist"}
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="flex items-center bg-muted/60 border border-border p-1 rounded-xl shadow-2xs">
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setErrorMessage(null);
          }}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-center",
            mode === "signin"
              ? "bg-card text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setErrorMessage(null);
          }}
          className={cn(
            "flex-1 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer text-center",
            mode === "signup"
              ? "bg-card text-foreground shadow-2xs"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Create Account
        </button>
      </div>

      {/* Error Message Alert */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium animate-in fade-in duration-150">
          {errorMessage}
        </div>
      )}

      {/* Sign-in Form */}
      {mode === "signin" && (
        <form
          onSubmit={handleSignIn}
          className="flex flex-col gap-4 animate-in fade-in duration-200"
        >
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
              setUsername("demo");
              setPassword("demo");
              setErrorMessage(null);
            }}
            className="w-full flex flex-col sm:flex-row items-center justify-between gap-2.5 p-3 rounded-xl bg-muted/40 hover:bg-muted/70 border border-border text-xs text-muted-foreground transition cursor-pointer text-left"
          >
            <span>
              Demo Login: username{" "}
              <code className="font-mono font-semibold text-foreground">demo</code> · password{" "}
              <code className="font-mono font-semibold text-foreground">demo</code>
            </span>
            <span className="shrink-0 font-medium text-[11px] text-foreground bg-card px-2.5 py-1 rounded-lg border border-border transition shadow-xs">
              Fill Demo Credentials
            </span>
          </button>
        </form>
      )}

      {/* Sign-up Form */}
      {mode === "signup" && (
        <form
          onSubmit={handleSignUp}
          className="flex flex-col gap-3.5 animate-in fade-in duration-200"
        >
          <div className="flex flex-col gap-1">
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
                value={signupUsername}
                onChange={(e) => setSignupUsername(e.target.value)}
                placeholder="e.g. alex"
                className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
              />
            </div>
            <span className="text-[11px] text-muted-foreground font-mono">
              3-30 characters, letters, numbers, hyphens
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="signup-display-name"
              className="text-xs font-medium text-foreground tracking-wide"
            >
              Display Name
            </label>
            <input
              id="signup-display-name"
              type="text"
              required
              value={signupDisplayName}
              onChange={(e) => setSignupDisplayName(e.target.value)}
              placeholder="e.g. Alex Rivers"
              maxLength={50}
              className="w-full h-10 px-3.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition"
            />
          </div>

          <div className="flex flex-col gap-1">
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
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                placeholder="At least 8 characters"
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

          <div className="flex flex-col gap-1">
            <label
              htmlFor="signup-invite-code"
              className="text-xs font-medium text-foreground tracking-wide flex items-center justify-between"
            >
              <span>Invite Code</span>
              <span className="text-[11px] text-muted-foreground font-normal">Required</span>
            </label>
            <div className="relative">
              <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                id="signup-invite-code"
                type="text"
                required
                value={signupInviteCode}
                onChange={(e) => setSignupInviteCode(e.target.value)}
                placeholder="Enter invite code"
                className="w-full h-10 pl-10 pr-3.5 rounded-xl bg-muted/40 border border-border text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 mt-2 rounded-xl bg-brand text-brand-foreground font-semibold text-xs tracking-wide hover:opacity-90 transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-xs"
          >
            <UserPlus className="size-4 stroke-[2.5]" />
            <span>{isSubmitting ? "Creating account..." : "Join Tracklist"}</span>
          </button>
        </form>
      )}
    </div>
  );
}
