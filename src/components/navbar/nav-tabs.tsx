"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_TABS = [
  { label: "Home", href: "/" },
  { label: "Shelf", href: "/shelf" },
  { label: "Discover", href: "/discover" },
];

export function NavTabs() {
  const pathname = usePathname();

  const isTabActive = (href: string) => {
    if (href === "/") {
      return pathname === "/" || pathname === "";
    }
    if (href === "/shelf") {
      return pathname.startsWith("/shelf") || pathname.startsWith("/library");
    }
    if (href === "/discover") {
      return pathname.startsWith("/discover") || pathname.startsWith("/explore");
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="hidden md:flex items-center gap-6" aria-label="Main Navigation">
      {NAV_TABS.map((tab) => {
        const active = isTabActive(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-[16px] font-medium leading-none transition-colors duration-150 rounded-sm py-1 select-none outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-0",
              active ? "text-white" : "text-neutral-400 hover:text-white",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
