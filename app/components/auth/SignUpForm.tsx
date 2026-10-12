"use client";

import type { ReactNode } from "react";
import * as Clerk from "@clerk/elements/common";
import * as SignUp from "@clerk/elements/sign-up";
import { useTranslations } from "next-intl";
import { ConfirmPasswordField } from "./ConfirmPasswordField";
import { ClerkFieldError, ClerkGlobalError } from "./ClerkError";

interface SignUpFormProps {
  /** Heading, links, plan card — shown above the fields on the first step. */
  intro: ReactNode;
  footnote?: ReactNode;
  /** "virtual" keeps every step on the current URL (used by /login's tabs). */
  routing?: "path" | "virtual";
  showSso?: boolean;
}

export function SignUpForm({ intro, footnote, routing = "path", showSso = true }: SignUpFormProps) {
  const t = useTranslations("auth.form");
  return (
    <SignUp.Root routing={routing}>
      <SignUp.Step name="start">
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

        <div className="field-pair">
          <Clerk.Field name="firstName" className="field">
            <Clerk.Label className="label">{t("firstName")}</Clerk.Label>
            <Clerk.Input autoComplete="given-name" className="input" required />
            <ClerkFieldError />
          </Clerk.Field>

          <Clerk.Field name="lastName" className="field">
            <Clerk.Label className="label">{t("lastName")}</Clerk.Label>
            <Clerk.Input autoComplete="family-name" className="input" required />
            <ClerkFieldError />
          </Clerk.Field>
        </div>

        <Clerk.Field name="emailAddress" className="field">
          <Clerk.Label className="label">{t("emailAddress")}</Clerk.Label>
          <Clerk.Input type="email" autoComplete="email" className="input" required />
          <ClerkFieldError />
        </Clerk.Field>

        <Clerk.Field name="password" className="field">
          <Clerk.Label className="label">{t("password")}</Clerk.Label>
          <Clerk.Input type="password" autoComplete="new-password" className="input" required />
          <ClerkFieldError />
        </Clerk.Field>

        <ConfirmPasswordField />

        <SignUp.Action submit className="btn btn-lg btn-block">
          {t("createAccount")}
        </SignUp.Action>
        {footnote}
      </SignUp.Step>

      <SignUp.Step name="verifications">
        <SignUp.Strategy name="email_code">
          <h1 className="display" style={{ fontSize: "var(--t-3xl)" }}>
            {t("verify.title")}
          </h1>
          <p className="muted" style={{ marginTop: 8 }}>
            {t("verify.sentToEmail")}
          </p>

          <Clerk.Field name="code" className="field">
            <Clerk.Label className="label">{t("verify.codeLabel")}</Clerk.Label>
            <Clerk.Input className="input" required />
            <ClerkFieldError />
          </Clerk.Field>

          <SignUp.Action submit className="btn btn-lg btn-block">
            {t("verify.submit")}
          </SignUp.Action>
        </SignUp.Strategy>
      </SignUp.Step>
    </SignUp.Root>
  );
}
