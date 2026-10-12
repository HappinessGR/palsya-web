"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { SiteHeader } from "../../components/SiteHeader";

/**
 * Clerk's post-sign-up fallback redirect (NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL)
 * lands here with an active session already set. Starts the cardless trial for
 * the plan the patient picked on the pricing page, then continues to
 * /onboarding (account setup -> assessment -> phase -> preferences ->
 * consent), which itself redirects to /dashboard once complete.
 */
export function StartingTrialClient() {
  const t = useTranslations("auth.startingTrial");
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    let planId: string | null = null;
    try {
      planId = sessionStorage.getItem("selectedPlan");
      sessionStorage.removeItem("selectedPlan");
    } catch {
      // Private browsing / storage disabled: the API falls back to the default plan.
    }

    fetch("/api/billing/start-trial", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId }),
    })
      .catch(() => {})
      .finally(() => router.replace("/onboarding"));
  }, [router]);

  return (
    <>
      <SiteHeader />
      <div className="page center" style={{ paddingTop: "var(--s-9)" }}>
        <p className="muted">{t("message")}</p>
      </div>
    </>
  );
}
