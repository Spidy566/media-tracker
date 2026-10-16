"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export function useActiveUser() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch session user
  const { data: sessionData, isLoading } = useQuery<{ user: User | null }>({
    queryKey: ["session-user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
      if (!res.ok) return { user: null };
      return res.json();
    },
  });

  // Logout mutation
  const { mutate: logout, isPending: isLoggingOut } = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(["session-user"], { user: null });
      queryClient.invalidateQueries({ queryKey: ["session-user"] });
      router.refresh();
      toast.success("Logged out successfully");
    },
  });

  return {
    currentUser: sessionData?.user ?? null,
    isLoading,
    logout,
    isLoggingOut,
  };
}
