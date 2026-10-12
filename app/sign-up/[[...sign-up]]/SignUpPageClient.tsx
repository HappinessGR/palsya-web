"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { SiteHeader } from "../../components/SiteHeader";
import { AuthSidePanel } from "../../components/AuthSidePanel";
import { SelectedPlanCard } from "../../components/auth/SelectedPlanCard";
import { SignUpForm } from "../../components/auth/SignUpForm";

export function SignUpPageClient() {
  const t = useTranslations("auth.signUp");

  return (
    <>
      <SiteHeader />
      <div className="auth-wrap">
        <AuthSidePanel
          title={t("side.title")}
          points={[
            t("side.points.matched"),
            t("side.points.scans"),
            t("side.points.consultations"),
            t("side.points.cancel"),
          ]}
          quote={{ q: t("side.quote"), who: "Marek T., Kraków" }}
        />
        <div className="auth-main">
          <div className="auth-card">
            <SignUpForm
              intro={
                <>
                  <h1 className="display" style={{ fontSize: "var(--t-3xl)" }}>
                    {t("title")}
                  </h1>
                  <p className="muted" style={{ marginTop: 8 }}>
                    {t.rich("haveAccount", { link: (chunks) => <Link href="/sign-in">{chunks}</Link> })}
                  </p>

                  <Suspense fallback={null}>
                    <SelectedPlanCard />
                  </Suspense>
                </>
              }
              footnote={
                <p className="small muted center" style={{ marginTop: 14 }}>
                  {t("footnote")}
                </p>
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
