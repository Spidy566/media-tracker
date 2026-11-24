import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist_Mono, Host_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import { PosterProvider } from "@/components/providers/poster-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HIDE_POSTERS_COOKIE } from "@/lib/poster-cookie";
import "./globals.css";

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const hostGrotesk = Host_Grotesk({
  variable: "--font-host-grotesk",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0B0C0F",
};

export const metadata: Metadata = {
  title: "Tracklist",
  description: "Minimal media tracker for movies, shows, and games.",
  other: {
    "darkreader-lock": "true",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const savedPosters = cookieStore.get(HIDE_POSTERS_COOKIE)?.value;
  const hidePosters = savedPosters
    ? savedPosters === "1"
    : process.env.NEXT_PUBLIC_STEALTH_MODE === "true";

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${barlowCondensed.variable} ${hostGrotesk.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <head>
        <meta name="darkreader-lock" content="true" />
      </head>
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background text-foreground"
      >
        <QueryProvider>
          <PosterProvider initialHidden={hidePosters}>
            <TooltipProvider>
              <main className="flex-1 pb-16 md:pb-0">{children}</main>
            </TooltipProvider>
          </PosterProvider>
        </QueryProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
