"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * Clerk has no confirm-password field, so this is a plain input that sits in
 * the same form as the Clerk password input and blocks submit (native
 * constraint validation) until the two match. It has no name, so Clerk never
 * sends it anywhere.
 */
export function ConfirmPasswordField() {
  const t = useTranslations("auth.form");
  const validityMessage = t("passwordsMismatchValidity");
  const ref = useRef<HTMLInputElement>(null);
  const [mismatch, setMismatch] = useState(false);

  useEffect(() => {
    const confirm = ref.current;
    const form = confirm?.form;
    if (!confirm || !form) return;

    const check = () => {
      const password = form.querySelector<HTMLInputElement>('input[name="password"]')?.value ?? "";
      const bad = confirm.value !== "" && confirm.value !== password;
      confirm.setCustomValidity(bad ? validityMessage : "");
      setMismatch(bad);
    };

    form.addEventListener("input", check);
    return () => form.removeEventListener("input", check);
  }, [validityMessage]);

  return (
    <div className="field">
      <label className="label" htmlFor="confirm-password">
        {t("confirmPassword")}
      </label>
      <input ref={ref} id="confirm-password" type="password" autoComplete="new-password" className="input" required />
      {mismatch && <p className="err">{t("passwordsMismatch")}</p>}
    </div>
  );
}
