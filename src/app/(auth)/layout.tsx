import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in · Tracklist",
  description: "Sign in to Tracklist.",
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background text-foreground">
      {children}
    </div>
  );
}
