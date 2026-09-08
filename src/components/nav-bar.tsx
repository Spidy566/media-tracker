"use client";

import { Search, UserCheck } from "lucide-react";
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
      <nav className="border-b bg-card sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="font-bold text-lg tracking-tight">
            SquadTracker 🎬🎮
          </Link>
          <Link
            href="/explore"
            className="text-sm font-medium text-muted-foreground hover:text-white transition"
          >
            Explore
          </Link>
          <div className="flex items-center gap-3">
            {/* Quick Search Button */}
            <Button
              variant="outline"
              size="sm"
              className="text-muted-foreground flex gap-2 h-9 px-3"
              onClick={() => setIsSearchOpen(true)}
            >
              <Search className="w-4 h-4" />
              <span>Search media...</span>
            </Button>

            {/* Friend Switcher */}
            {currentUser && (
              <div className="flex items-center gap-1.5 pl-2 border-l">
                <UserCheck className="w-4 h-4 text-muted-foreground" />
                <Select value={currentUser.id} onValueChange={setActiveUser}>
                  <SelectTrigger className="w-28 h-8 text-xs font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
