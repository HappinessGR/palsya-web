"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { isPasswordTooLong, isStrongPassword } from "../../src/lib/password-policy";
import { Icon } from "../components/Icon";
import { PasswordInput } from "../components/auth/PasswordInput";
import { PasswordChecklist } from "../components/auth/PasswordChecklist";
import { resetPasswordAction, type ResetState } from "./actions";
import { LinkProblem } from "./LinkProblem";

const REDIRECT_DELAY_MS = 3000;

export function ResetPasswordForm({ token, ttlMinutes }: { token: string; ttlMinutes: number }) {
  const t = useTranslations("passwordReset.reset");
  const router = useRouter();
  const [state, formAction, pending] = useActionState<ResetState, FormData>(resetPasswordAction, { status: "idle" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const done = state.status === "done";
  useEffect(() => {
    if (!done) return;
    const timer = setTimeout(() => router.push("/sign-in"), REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [done, router]);

  if (done) {
    return (
      <>
        <div role="status" className="note note-ok">
          <Icon name="check" className="note-icon" />
          <div>
            <h1 className="display" style={{ fontSize: "var(--t-2xl)", margin: 0 }}>
              {t("success.title")}
            </h1>
            <p style={{ marginTop: 8 }}>{t("success.body")}</p>
          </div>
        </div>
        <Link href="/sign-in" className="btn btn-lg btn-block" style={{ marginTop: 24 }}>
          {t("success.signInNow")}
        </Link>
      </>
    );
  }

  if (state.status === "error" && (state.error === "invalid" || state.error === "expired" || state.error === "used")) {
    return <LinkProblem kind={state.error} ttlMinutes={ttlMinutes} />;
  }

  const tooLong = isPasswordTooLong(password);
  const matches = confirm.length > 0 && confirm === password;
  const canSubmit = isStrongPassword(password) && matches && !pending;
  const serverError = state.status === "error" ? state.error : null;

  return (
    <>
      <h1 className="display" style={{ fontSize: "var(--t-3xl)" }}>
        {t("title")}
      </h1>
      <p className="muted" style={{ marginTop: 8 }}>
        {t("intro")}
      </p>

      <form action={formAction} style={{ marginTop: 24 }}>
        <input type="hidden" name="token" value={token} />

        {serverError && (
          <p role="alert" className="err" style={{ marginTop: 0, marginBottom: "var(--s-4)" }}>
            {t(`errors.${serverError}`)}
          </p>
        )}

        <PasswordInput
          id="new-password"
          name="password"
          label={t("newPassword")}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          describedBy={tooLong ? "password-rules password-too-long" : "password-rules"}
          invalid={tooLong}
        />
        <PasswordChecklist id="password-rules" password={password} />
        {tooLong && (
          <p id="password-too-long" role="alert" className="err" style={{ marginTop: "calc(-1 * var(--s-3))", marginBottom: "var(--s-5)" }}>
            {t("tooLong")}
          </p>
        )}

        <PasswordInput
          id="confirm-password"
          name="confirm"
          label={t("confirmPassword")}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          describedBy={confirm ? "password-match" : undefined}
          invalid={confirm.length > 0 && !matches}
        />
        <p
          id="password-match"
          aria-live="polite"
          className={matches ? "hint" : "err"}
          style={{
            marginTop: "calc(-1 * var(--s-3))",
            marginBottom: "var(--s-5)",
            color: matches ? "var(--ok)" : undefined,
            minHeight: "1.4em",
          }}
        >
          {confirm.length === 0 ? null : matches ? (
            <>
              <span aria-hidden="true">✓ </span>
              {t("match")}
            </>
          ) : (
            t("noMatch")
          )}
        </p>

        <button type="submit" className="btn btn-lg btn-block" disabled={!canSubmit}>
          {pending ? t("saving") : t("submit")}
        </button>
      </form>
    </>
  );
}
