"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { SiteHeader } from "../../components/SiteHeader";

// Error codes from /api/auth/finalize -> auth.continue.errors.<key>.
const ERROR_KEYS: Record<string, string> = {
  account_suspended: "accountSuspended",
  not_signed_in: "notSignedIn",
};

/**
 * Clerk's post-sign-in and post-sign-up fallback redirect
 * (NEXT_PUBLIC_CLERK_SIGN_*_FALLBACK_REDIRECT_URL) lands here with a session
 * already active. Sends nothing but the session cookie: the server looks up
 * this account's role and answers with where it belongs.
 */
export function AuthContinueClient() {
  const t = useTranslations("auth.continue");
  const router = useRouter();
  const { signOut } = useClerk();
  const started = useRef(false);
  const [message, setMessage] = useState(() => t("signingIn"));

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    fetch("/api/auth/finalize", { method: "POST" })
      .then((res) => res.json() as Promise<{ redirect?: string; error?: string }>)
      .then(async (data) => {
        if (data.redirect) {
          router.replace(data.redirect);
          return;
        }
        const code = data.error && ERROR_KEYS[data.error] ? data.error : "generic";
        setMessage(t(`errors.${ERROR_KEYS[code] ?? "generic"}`));
        await signOut();
        router.replace(`/login?${new URLSearchParams({ error: code })}`);
      })
      .catch(() => setMessage(t("errors.network")));
  }, [router, signOut, t]);

  return (
    <>
      <SiteHeader />
      <div className="page center" style={{ paddingTop: "var(--s-9)" }}>
        <p className="muted">{message}</p>
      </div>
    </>
  );
}
