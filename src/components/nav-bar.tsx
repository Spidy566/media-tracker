"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SearchModal } from "@/components/search-modal";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveUser } from "@/hooks/use-active-user";

export function NavBar() {
  const { users, currentUser, setActiveUser } = useActiveUser();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <>
      <nav className="border-b border-white/10 bg-[#0e1015]/90 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-bold text-base sm:text-lg tracking-tight flex items-center gap-2 text-white"
            >
              <span>SquadTracker</span>
              <span className="text-xs bg-[#ff4b72]/15 text-[#ff4b72] px-1.5 py-0.5 rounded font-mono font-bold">
                PRO
              </span>
            </Link>
            <Link
              href="/explore"
              className="text-xs font-semibold text-muted-foreground hover:text-white transition uppercase tracking-wider"
            >
              Explore
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Search Button */}
            <Button
              variant="outline"
              size="sm"
              className="border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-white flex gap-2 h-8 px-3 text-xs"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search movies, shows, games...</span>
              <span className="sm:hidden">Search...</span>
            </Button>

            {/* Friend Switcher */}
            {currentUser && (
              <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                <Select value={currentUser.id} onValueChange={setActiveUser}>
                  <SelectTrigger className="w-28 h-8 text-xs font-medium border-white/10 bg-white/5 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#181c24] border-white/10 text-white">
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      </nav>

      {currentUser && (
        <SearchModal
          userId={currentUser.id}
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
        />
      )}
    </>
  );
}
