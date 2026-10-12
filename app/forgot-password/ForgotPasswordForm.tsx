"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "../components/Icon";
import { requestResetAction, type ForgotState } from "./actions";

export function ForgotPasswordForm({ ttlMinutes }: { ttlMinutes: number }) {
  const t = useTranslations("passwordReset");
  const [state, formAction, pending] = useActionState<ForgotState, FormData>(requestResetAction, { status: "idle" });

  return (
    <>
      <h1 className="display" style={{ fontSize: "var(--t-3xl)" }}>
        {t("forgot.title")}
      </h1>

      {state.status === "sent" ? (
        <div role="status" className="note note-ok" style={{ marginTop: 24 }}>
          <Icon name="check" className="note-icon" />
          <div>
            <strong>{t("forgot.sent")}</strong>
            <p className="small" style={{ marginTop: 6 }}>
              {t("forgot.sentHint", { minutes: ttlMinutes })}
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="muted" style={{ marginTop: 8 }}>
            {t("forgot.intro")}
          </p>
          <form action={formAction} style={{ marginTop: 24 }}>
            <div className="field">
              <label className="label" htmlFor="reset-email">
                {t("forgot.emailLabel")}
              </label>
              <input
                id="reset-email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                maxLength={254}
                className="input"
                required
              />
            </div>
            <button type="submit" className="btn btn-lg btn-block" disabled={pending} aria-disabled={pending}>
              {pending ? t("forgot.sending") : t("forgot.submit")}
            </button>
          </form>
        </>
      )}

      <p className="small" style={{ marginTop: 24, textAlign: "center" }}>
        <Link href="/sign-in">{t("backToSignIn")}</Link>
      </p>
    </>
  );
}
