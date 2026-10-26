"use client";

import { ChevronDown, LogOut, Settings, ShieldCheck, User as UserIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import type { CurrentUser } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";

interface NavActionsProps {
  user: CurrentUser;
  isAdmin?: boolean;
}

function getInitials(displayName?: string, username?: string): string {
  const name = displayName?.trim() || username?.trim() || "User";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function NavActions({ user, isAdmin = false }: NavActionsProps) {
  const initials = getInitials(user.displayName, user.username);

  const handleLogout = async () => {
    try {
      await authClient.signOut();
      window.location.href = "/login";
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="flex items-center gap-3 shrink-0">
      {/* User Avatar Dropdown (Desktop & Mobile) */}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="group flex items-center gap-1.5 rounded-full p-0.5 hover:bg-white/6 transition-colors cursor-pointer outline-none focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-0 select-none"
            aria-label="User account menu"
          >
            {user.avatarUrl ? (
              <Image
                src={user.avatarUrl}
                alt={user.displayName || user.username}
                width={40}
                height={40}
                className="size-10 rounded-full object-cover border border-white/10"
                unoptimized
              />
            ) : (
              <div className="size-10 rounded-full bg-neutral-800 text-white font-medium text-xs sm:text-sm flex items-center justify-center border border-white/10">
                {initials}
              </div>
            )}
            <ChevronDown
              className="size-4 text-neutral-400 group-hover:text-white transition-transform duration-200 group-data-[state=open]:rotate-180"
              strokeWidth={1.75}
            />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-50 min-w-56 rounded-2xl bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 p-1.5 shadow-2xl animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 text-white"
          >
            <div className="px-3 py-2.5 border-b border-white/8 mb-1">
              <p className="text-xs font-medium text-white truncate">{user.displayName}</p>
              <p className="text-[11px] text-neutral-400 truncate">@{user.username}</p>
            </div>

            <DropdownMenu.Item asChild>
              <Link
                href="/shelf"
                className="flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm rounded-xl text-neutral-300 hover:text-white hover:bg-white/8 transition-colors cursor-pointer outline-none focus:outline-none focus:bg-white/8 focus:text-white"
              >
                <UserIcon className="size-4 text-neutral-400" strokeWidth={1.75} />
                <span>Profile</span>
              </Link>
            </DropdownMenu.Item>

            <DropdownMenu.Item asChild>
              <Link
                href="/settings"
                className="flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm rounded-xl text-neutral-300 hover:text-white hover:bg-white/8 transition-colors cursor-pointer outline-none focus:outline-none focus:bg-white/8 focus:text-white"
              >
                <Settings className="size-4 text-neutral-400" strokeWidth={1.75} />
                <span>Settings</span>
              </Link>
            </DropdownMenu.Item>

            {isAdmin && (
              <DropdownMenu.Item asChild>
                <Link
                  href="/admin"
                  className="flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm rounded-xl text-neutral-300 hover:text-white hover:bg-white/8 transition-colors cursor-pointer outline-none focus:outline-none focus:bg-white/8 focus:text-white"
                >
                  <ShieldCheck className="size-4 text-neutral-400" strokeWidth={1.75} />
                  <span>Admin Console</span>
                </Link>
              </DropdownMenu.Item>
            )}

            <DropdownMenu.Separator className="h-px bg-white/8 my-1" />

            <DropdownMenu.Item
              onSelect={handleLogout}
              className="flex items-center gap-2.5 px-3 py-2 text-xs sm:text-sm rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer outline-none focus:outline-none focus:bg-red-500/10 focus:text-red-300"
            >
              <LogOut className="size-4" strokeWidth={1.75} />
              <span>Sign out</span>
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
