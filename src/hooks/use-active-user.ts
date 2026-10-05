"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useSyncExternalStore } from "react";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

// ─────────────────────────────────────────────────────────────
// Module-Level Reactive Store (Shares state across all components)
// ─────────────────────────────────────────────────────────────
let currentActiveUserId: string | null =
  typeof window !== "undefined" ? localStorage.getItem("active_user_id") : null;
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot() {
  return currentActiveUserId;
}

function getServerSnapshot() {
  return null;
}

function setGlobalActiveUserId(id: string) {
  currentActiveUserId = id;
  if (typeof window !== "undefined") {
    localStorage.setItem("active_user_id", id);
  }
  for (const listener of listeners) {
    listener();
  }
}

export function useActiveUser() {
  const queryClient = useQueryClient();
  const activeUserId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const { data } = useQuery<{ users: User[] }>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
  });

  const usersList = data?.users || [];

  // Default to first user if none set
  useEffect(() => {
    if (!activeUserId && usersList.length > 0) {
      setGlobalActiveUserId(usersList[0].id);
    }
  }, [activeUserId, usersList]);

  // When switching users, update globally and refresh queries immediately
  const setActiveUser = (id: string) => {
    setGlobalActiveUserId(id);
    queryClient.invalidateQueries({ queryKey: ["my-entries"] });
    queryClient.invalidateQueries({ queryKey: ["squad-entries"] });
  };

  const currentUser = usersList.find((u) => u.id === activeUserId) || usersList[0] || null;

  return {
    users: usersList,
    currentUser,
    setActiveUser,
  };
}
