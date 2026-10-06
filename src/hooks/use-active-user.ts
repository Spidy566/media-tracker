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
  const { data: sessionData, isLoading } = useQuery<{ user: User | null }>({
    queryKey: ["session-user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/session");
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
      queryClient.invalidateQueries({ queryKey: ["my-entries"] });
      router.refresh();
      toast.success("Logged out successfully");
    },
  });

  return {
    users: usersList,
    currentUser: sessionData?.user ?? null,
    isLoading,
    logout,
    isLoggingOut,
  };
}
