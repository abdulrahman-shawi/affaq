"use client";

import { useSession, signOut } from "next-auth/react";
import type { Role } from "@/types";

export function useAuth() {
  const { data: session, status } = useSession();

  return {
    user: session?.user ?? null,
    role: (session?.user?.role ?? null) as Role | null,
    loading: status === "loading",
    authenticated: status === "authenticated",
    logout: () => signOut({ callbackUrl: "/login" }),
  };
}
