"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export function useActiveUser() {
  const { data } = useQuery<{ users: User[] }>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      return res.json();
    },
  });

  const usersList = data?.users || [];
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("active_user_id");
    if (saved) {
      setActiveUserId(saved);
    } else if (usersList.length > 0) {
      setActiveUserId(usersList[0].id);
      localStorage.setItem("active_user_id", usersList[0].id);
    }
  }, [usersList]);

  const setActiveUser = (id: string) => {
    setActiveUserId(id);
    localStorage.setItem("active_user_id", id);
  };

  const currentUser = usersList.find((u) => u.id === activeUserId) || usersList[0] || null;

  return {
    users: usersList,
    currentUser,
    setActiveUser,
  };
}