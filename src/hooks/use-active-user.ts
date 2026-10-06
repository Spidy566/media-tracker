"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation"; // 1. Import useRouter
import { useEffect } from "react";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export function useActiveUser() {
  const router = useRouter(); // 2. Initialize router
  const queryClient = useQueryClient();

  // Fetch squad users
  const { data: usersData } = useQuery<{ users: User[] }>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
  });

  const usersList = usersData?.users || [];

  // Fetch session user
  const { data: sessionData } = useQuery<{ user: User | null }>({
    queryKey: ["session-user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      return res.json();
    },
  });

  // Switch user mutation
  const { mutate: switchUser } = useMutation({
    mutationFn: async (userId: string) => {
      await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session-user"] });
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      router.refresh(); // 3. Re-runs Server Components with the new session cookie!
    },
  });

  useEffect(() => {
    if (sessionData && !sessionData.user && usersList.length > 0) {
      switchUser(usersList[0].id);
    }
  }, [sessionData, usersList, switchUser]);

  return {
    users: usersList,
    currentUser: sessionData?.user ?? null,
    setActiveUser: switchUser,
  };
}
