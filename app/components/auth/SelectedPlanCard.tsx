"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Icon } from "../Icon";
import { plans, money } from "../../lib/content";
import type { Locale } from "../../../i18n/config";

// Wrap in <Suspense>: useSearchParams opts the page out of static rendering.
export function SelectedPlanCard() {
  const searchParams = useSearchParams();
  const t = useTranslations("auth.plan");
  const tPricing = useTranslations("pricing.plans");
  const locale = useLocale() as Locale;
  const plan = plans.find((p) => p.id === searchParams.get("plan")) ?? plans[1];

  // Carried through to /sign-up/starting-trial, which Clerk redirects to
  // after verification completes — its own navigation drops query params.
  useEffect(() => {
    try {
      sessionStorage.setItem("selectedPlan", plan.id);
    } catch {
      // Private browsing / storage disabled: starting-trial falls back to the default plan.
    }
  }, [plan.id]);

  return (
    <div className="card card-pad-sm card-tint" style={{ marginTop: 22 }}>
      <div className="row-between" style={{ gap: 12, flexWrap: "wrap" }}>
        <div>
          <div className="small muted">{t("selected")}</div>
          <div className="strong">{tPricing(`${plan.id}.name`)}</div>
        </div>
        <div className="tr">
          <div className="strong num">{money(plan.price, locale)}</div>
          <div className="small muted">{t("afterTrial")}</div>
        </div>
      </div>
      <Link className="link-arrow small" href="/pricing" style={{ marginTop: 10 }}>
        {t("change")}
        <Icon name="arrow-right" size={14} />
      </Link>
    </div>
  );
}
