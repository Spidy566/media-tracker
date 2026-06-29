"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Search, Library, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
    { href: "/", label: "Home", icon: Film },
    { href: "/search", label: "Movies", icon: Search },
    { href: "/games/search", label: "Games", icon: Gamepad2 },
    { href: "/library", label: "Library", icon: Library },
];

export function NavBar() {
    const pathname = usePathname();

    return (
        <nav className="border-b bg-background">
            <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-6">
                <Link href="/" className="font-bold text-lg mr-4">
                    Tracker
                </Link>
                {links.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={cn(
                            "flex items-center gap-1.5 text-sm font-medium transition-colors",
                            pathname === href
                                ? "text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}