import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Suspense } from "react";
import { NavBar } from "@/components/nav-bar";
import { QueryProvider } from "@/components/providers/query-provider";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-100">
        <QueryProvider>
          <Suspense fallback={<div className="h-14 border-b border-zinc-800 bg-zinc-950" />}>
            <NavBar />
          </Suspense>
          <div className="flex-1 pb-16 md:pb-0">{children}</div>
        </QueryProvider>
      </body>
    </html>
  );
}
