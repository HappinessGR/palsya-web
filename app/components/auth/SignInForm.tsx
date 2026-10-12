"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Link from "next/link";
import * as Clerk from "@clerk/elements/common";
import * as SignIn from "@clerk/elements/sign-in";
import { useSignIn } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import { ClerkFieldError, ClerkGlobalError } from "./ClerkError";

/**
 * Works around a @clerk/elements@0.24.x bug: its second-factor "prepare"
 * step only ever calls prepareSecondFactor for the phone_code strategy
 * (hardcoded in its sign-in machine), so an email_code second factor is
 * never actually sent — <SignIn.Action resend> fires no request either,
 * since it shares the same broken prepare actor. Bypasses Elements here by
 * calling the classic resource method directly; it's the same underlying
 * SignIn resource Elements itself drives, so this is safe to mix in.
 */
function AutoSendEmailSecondFactor() {
  const { isLoaded, signIn } = useSignIn();
  const sentRef = useRef(false);

  useEffect(() => {
    if (!isLoaded || !signIn || sentRef.current) return;
    if (signIn.status !== "needs_second_factor") return;
    const hasEmailCodeFactor = signIn.supportedSecondFactors?.some((f) => f.strategy === "email_code");
    if (!hasEmailCodeFactor) return;

    sentRef.current = true;
    signIn.prepareSecondFactor({ strategy: "email_code" }).catch(() => {
      sentRef.current = false;
    });
  }, [isLoaded, signIn]);

  return null;
}

interface SignInFormProps {
  /** Heading, links and anything else shown above the fields on the first step. */
  intro: ReactNode;
  /** "virtual" keeps every step on the current URL (used by /login's tabs). */
  routing?: "path" | "virtual";
  showSso?: boolean;
}

export function SignInForm({ intro, routing = "path", showSso = true }: SignInFormProps) {
  const t = useTranslations("auth.form");
  const tReset = useTranslations("passwordReset");
  const forgotLink = (
    <p className="small" style={{ marginTop: 6 }}>
      <Link href="/forgot-password">{tReset("forgotLink")}</Link>
    </p>
  );
  return (
    <SignIn.Root routing={routing}>
      <SignIn.Step name="start">
        {intro}

        {showSso && (
          <div style={{ marginTop: 24 }}>
            <Clerk.Connection name="google" className="sso-btn">
              {t("sso.google")}
            </Clerk.Connection>
            <Clerk.Connection name="apple" className="sso-btn">
              {t("sso.apple")}
            </Clerk.Connection>
            <div className="divider-or">{t("sso.or")}</div>
          </div>
        )}

        <ClerkGlobalError />

        <Clerk.Field name="identifier" className="field">
          <Clerk.Label className="label">{t("emailAddress")}</Clerk.Label>
          <Clerk.Input type="email" autoComplete="email" className="input" required />
          <ClerkFieldError />
        </Clerk.Field>

        <Clerk.Field name="password" className="field">
          <Clerk.Label className="label">{t("password")}</Clerk.Label>
          <Clerk.Input type="password" autoComplete="current-password" className="input" required />
          <ClerkFieldError />
          {forgotLink}
        </Clerk.Field>

        <SignIn.Action submit className="btn btn-lg btn-block">
          {t("signIn")}
        </SignIn.Action>
      </SignIn.Step>

      <SignIn.Step name="verifications">
        <SignIn.Strategy name="email_code">
          <h1 className="display" style={{ fontSize: "var(--t-3xl)" }}>
            {t("verify.title")}
          </h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {t.rich("verify.sentTo", { identifier: () => <SignIn.SafeIdentifier /> })}
          </p>

          <Clerk.Field name="code" className="field">
            <Clerk.Label className="label">{t("verify.codeLabel")}</Clerk.Label>
            <Clerk.Input className="input" required />
            <ClerkFieldError />
          </Clerk.Field>

          <SignIn.Action submit className="btn btn-lg btn-block">
            {t("verify.submit")}
          </SignIn.Action>
          <AutoSendEmailSecondFactor />
        </SignIn.Strategy>

        <SignIn.Strategy name="password">
          <h1 className="display" style={{ fontSize: "var(--t-3xl)" }}>
            {t("enterPassword")}
          </h1>

          <Clerk.Field name="password" className="field">
            <Clerk.Label className="label">{t("password")}</Clerk.Label>
            <Clerk.Input type="password" autoComplete="current-password" className="input" required />
            <ClerkFieldError />
            {forgotLink}
          </Clerk.Field>

          <SignIn.Action submit className="btn btn-lg btn-block">
            {t("continue")}
          </SignIn.Action>
        </SignIn.Strategy>
      </SignIn.Step>
    </SignIn.Root>
  );
}
