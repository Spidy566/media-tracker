import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { Suspense } from "react";
import { NavBar } from "@/components/nav-bar";
import { PosterProvider } from "@/components/providers/poster-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { HIDE_POSTERS_COOKIE } from "@/lib/poster-cookie";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tracklist",
  description: "Minimal media tracker for movies, shows, and games.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const saved = (await cookies()).get(HIDE_POSTERS_COOKIE)?.value;
  const hidePosters = saved ? saved === "1" : process.env.NEXT_PUBLIC_STEALTH_MODE === "true";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <QueryProvider>
            <PosterProvider initialHidden={hidePosters}>
              <Suspense fallback={<div className="h-16 border-b border-border bg-card" />}>
                <NavBar />
              </Suspense>
              <div className="flex-1 pb-16 md:pb-0">{children}</div>
            </PosterProvider>
          </QueryProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
