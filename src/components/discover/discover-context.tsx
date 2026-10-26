"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useState } from "react";

interface DiscoverContextType {
  isIslandMode: boolean;
  setIsIslandMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  toggleIslandMode: () => void;
  searchPlaceholder: string | null;
  setSearchPlaceholder: (placeholder: string | null) => void;
}

const DiscoverContext = createContext<DiscoverContextType>({
  isIslandMode: false,
  setIsIslandMode: () => {},
  toggleIslandMode: () => {},
  searchPlaceholder: null,
  setSearchPlaceholder: () => {},
});

export function DiscoverProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDiscoverPage = pathname === "/discover" || pathname.startsWith("/discover/");
  const [isIslandMode, setIsIslandMode] = useState(false);
  const [searchPlaceholder, setSearchPlaceholder] = useState<string | null>(null);

  // If navigating away from /discover, reset island mode and search placeholder
  useEffect(() => {
    if (!isDiscoverPage) {
      setIsIslandMode(false);
      setSearchPlaceholder(null);
    }
  }, [isDiscoverPage]);

  const toggleIslandMode = () => {
    if (isDiscoverPage) {
      setIsIslandMode((prev) => !prev);
    }
  };

  return (
    <DiscoverContext.Provider
      value={{
        isIslandMode: isDiscoverPage ? isIslandMode : false,
        setIsIslandMode,
        toggleIslandMode,
        searchPlaceholder: isDiscoverPage ? searchPlaceholder : null,
        setSearchPlaceholder,
      }}
    >
      {children}
    </DiscoverContext.Provider>
  );
}

export function useDiscover() {
  return useContext(DiscoverContext);
}
