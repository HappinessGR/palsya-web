"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { SiteHeader } from "../../components/SiteHeader";
import { AuthSidePanel } from "../../components/AuthSidePanel";
import { SignInForm } from "../../components/auth/SignInForm";

export function SignInPageClient() {
  const t = useTranslations("auth.signIn");

  return (
    <>
      <SiteHeader />
      <div className="auth-wrap">
        <AuthSidePanel title={t("side.title")} points={[t("side.points.history"), t("side.points.missedDays")]} />
        <div className="auth-main">
          <div className="auth-card">
            <SignInForm
              intro={
                <>
                  <h1 className="display" style={{ fontSize: "var(--t-3xl)" }}>
                    {t("title")}
                  </h1>
                  <p className="muted" style={{ marginTop: 8 }}>
                    {t.rich("newHere", { link: (chunks) => <Link href="/sign-up">{chunks}</Link> })}
                  </p>
                </>
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
