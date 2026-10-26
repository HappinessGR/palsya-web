"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

/**
 * The root layout (and so EditModeRoot) is not re-rendered on client-side
 * navigation, and signing in or out navigates client-side. When the Clerk
 * session no longer matches the user the server rendered for, refresh once so
 * EditModeRoot re-checks the role and an admin gets the "Edit this page" button
 * without reloading.
 */
export function EditModeAuthSync({ serverUserId }: { serverUserId: string | null }) {
  const { isLoaded, userId } = useAuth();
  const router = useRouter();
  const refreshedFor = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    const current = userId ?? null;
    if (current === serverUserId || refreshedFor.current === current) return;
    refreshedFor.current = current;
    router.refresh();
  }, [isLoaded, userId, serverUserId, router]);

  return null;
}
