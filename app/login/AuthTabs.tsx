"use client";

import { Suspense, useState } from "react";
import { useTranslations } from "next-intl";
import { SignInForm } from "../components/auth/SignInForm";
import { SignUpForm } from "../components/auth/SignUpForm";
import { SelectedPlanCard } from "../components/auth/SelectedPlanCard";

type Mode = "signin" | "signup";

// Sign in is email + password for every account; the role comes from the
// database after sign-in. Sign up creates patient accounts only — clinicians
// and admins are invited by an admin.
export function AuthTabs({ initialMode, error }: { initialMode: Mode; error?: string }) {
  const t = useTranslations("auth");
  const [mode, setMode] = useState<Mode>(initialMode);

  const tabs = (
    <div className="seg auth-tabs" role="tablist" aria-label={t("tabs.ariaLabel")}>
      <button type="button" role="tab" aria-selected={mode === "signin"} onClick={() => setMode("signin")}>
        {t("tabs.signIn")}
      </button>
      <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => setMode("signup")}>
        {t("tabs.signUp")}
      </button>
    </div>
  );

  const errorBox = error ? (
    <p className="err" role="alert" style={{ marginTop: 16 }}>
      {error}
    </p>
  ) : null;

  if (mode === "signin") {
    return (
      <SignInForm
        routing="virtual"
        showSso={false}
        intro={
          <>
            {tabs}
            <h1 className="display" style={{ fontSize: "var(--t-3xl)", marginTop: 20 }}>
              {t("login.signIn.title")}
            </h1>
            <p className="muted" style={{ marginTop: 8 }}>
              {t.rich("login.signIn.noAccount", {
                link: (chunks) => (
                  <button type="button" className="link-btn" onClick={() => setMode("signup")}>
                    {chunks}
                  </button>
                ),
              })}
            </p>
            {errorBox}
          </>
        }
      />
    );
  }

  return (
    <SignUpForm
      routing="virtual"
      showSso={false}
      intro={
        <>
          {tabs}
          <h1 className="display" style={{ fontSize: "var(--t-3xl)", marginTop: 20 }}>
            {t("login.signUp.title")}
          </h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {t.rich("login.signUp.haveAccount", {
              link: (chunks) => (
                <button type="button" className="link-btn" onClick={() => setMode("signin")}>
                  {chunks}
                </button>
              ),
            })}
          </p>
          {errorBox}
          <Suspense fallback={null}>
            <SelectedPlanCard />
          </Suspense>
        </>
      }
      footnote={
        <p className="small muted center" style={{ marginTop: 14 }}>
          {t("signUp.footnote")}
        </p>
      }
    />
  );
}
