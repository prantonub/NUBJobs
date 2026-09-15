"use client";

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { useAuthContext } from "@/contexts/AuthContext";

export function RequireAuth({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: string[];
}) {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    return null;
  }

  if (!user) {
    redirect("/login");
    return null;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    redirect("/");
    return null;
  }

  return children;
}
