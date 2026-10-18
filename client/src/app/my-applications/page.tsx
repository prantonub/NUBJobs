"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuthContext } from "@/contexts/AuthContext";

/**
 * /my-applications — role-aware relay for the footer's "My Applications" link.
 * Students land on their application tracker, employers on the applicant
 * pipeline for their jobs, and signed-out visitors on /login. This keeps a
 * single stable footer URL that always sends each role to the right place.
 */
export default function MyApplicationsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuthContext();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (user.role === "EMPLOYER") {
      router.replace("/employer/applications");
    } else if (user.role === "STUDENT") {
      router.replace("/dashboard/applications");
    } else {
      // Admins/moderators manage everything from the admin panel instead.
      router.replace("/");
    }
  }, [user, isLoading, router]);

  return <LoadingSpinner label="Opening your applications…" fullscreen />;
}
