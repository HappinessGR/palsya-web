"use client";

import * as Clerk from "@clerk/elements/common";
import { useTranslations } from "next-intl";

/**
 * Clerk's API returns English error messages. These wrappers render the
 * translated `auth.clerkErrors.<code>` message instead (Clerk codes are
 * snake_case and used as keys as-is), falling back to a generic message
 * for codes we have no translation for.
 */
function useClerkErrorMessage() {
  const t = useTranslations("auth.clerkErrors");
  return (code: string | undefined) => (code && code !== "generic" && t.has(code) ? t(code) : t("generic"));
}

export function ClerkFieldError({ className = "err" }: { className?: string }) {
  const message = useClerkErrorMessage();
  return <Clerk.FieldError className={className}>{({ code }) => message(code)}</Clerk.FieldError>;
}

export function ClerkGlobalError({ className = "err" }: { className?: string }) {
  const message = useClerkErrorMessage();
  return <Clerk.GlobalError className={className}>{({ code }) => message(code)}</Clerk.GlobalError>;
}
