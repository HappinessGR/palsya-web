"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { checkPassword } from "../../../src/lib/password-policy";

const srOnly: CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
  border: 0,
};

/** Live list of the password rules from src/lib/password-policy.ts, each ticked as it is met. */
export function PasswordChecklist({ password, id }: { password: string; id?: string }) {
  const t = useTranslations("passwordReset.rules");
  const results = checkPassword(password);

  return (
    <div id={id} style={{ marginTop: "calc(-1 * var(--s-3))", marginBottom: "var(--s-5)" }}>
      <p className="small muted" style={{ margin: 0 }}>
        {t("heading")}
      </p>
      <ul aria-live="polite" style={{ listStyle: "none", padding: 0, margin: "6px 0 0", display: "grid", gap: 4 }}>
        {results.map((r) => (
          <li
            key={r.id}
            className="small"
            style={{ display: "flex", gap: 8, alignItems: "baseline", color: r.ok ? "var(--ok)" : "var(--ink-3)" }}
          >
            <span aria-hidden="true" style={{ width: 14, flex: "none", fontWeight: 700 }}>
              {r.ok ? "✓" : "✗"}
            </span>
            <span>
              <span style={srOnly}>{r.ok ? t("met") : t("notMet")} </span>
              {t(r.id)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
