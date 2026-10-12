"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import { useTranslations } from "next-intl";
import { SiteHeader } from "../components/SiteHeader";
import { AuthSidePanel } from "../components/AuthSidePanel";
import { ConfirmPasswordField } from "../components/auth/ConfirmPasswordField";
import { ClerkFieldError, ClerkGlobalError } from "../components/auth/ClerkError";

export function AcceptInviteForm() {
  const t = useTranslations("invite");
  const tf = useTranslations("auth.form");
  const params = useSearchParams();
  const hasTicket = Boolean(params.get("__clerk_ticket") || params.get("__clerk_invitation_token"));

  return (
    <>
      <SiteHeader />
      <div className="auth-wrap">
        <AuthSidePanel title={t("side.title")} points={[t("side.points.role"), t("side.points.password")]} />
        <div className="auth-main">
          <div className="auth-card">
            {!hasTicket ? (
              <>
                <h1 className="display" style={{ fontSize: "var(--t-3xl)" }}>
                  {t("missing.title")}
                </h1>
                <p className="muted" style={{ marginTop: 8 }}>
                  {t("missing.body")}
                </p>
                <Link className="btn btn-lg btn-block" href="/sign-in" style={{ marginTop: 24 }}>
                  {t("missing.signIn")}
                </Link>
              </>
            ) : (
              <SignUp.Root path="/accept-invite">
                <SignUp.Step name="start">
                  <h1 className="display" style={{ fontSize: "var(--t-3xl)" }}>
                    {t("title")}
                  </h1>
                  <p className="muted" style={{ marginTop: 8 }}>
                    {t("lead")}
                  </p>

                  <ClerkGlobalError />

                  <div className="field-pair" style={{ marginTop: 20 }}>
                    <Clerk.Field name="firstName" className="field">
                      <Clerk.Label className="label">{tf("firstName")}</Clerk.Label>
                      <Clerk.Input autoComplete="given-name" className="input" required />
                      <ClerkFieldError />
                    </Clerk.Field>
                    <Clerk.Field name="lastName" className="field">
                      <Clerk.Label className="label">{tf("lastName")}</Clerk.Label>
                      <Clerk.Input autoComplete="family-name" className="input" required />
                      <ClerkFieldError />
                    </Clerk.Field>
                  </div>

                  <Clerk.Field name="password" className="field">
                    <Clerk.Label className="label">{tf("password")}</Clerk.Label>
                    <Clerk.Input type="password" autoComplete="new-password" className="input" required />
                    <ClerkFieldError />
                  </Clerk.Field>

                  <ConfirmPasswordField />

                  <SignUp.Action submit className="btn btn-lg btn-block">
                    {t("submit")}
                  </SignUp.Action>
                </SignUp.Step>
              </SignUp.Root>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
