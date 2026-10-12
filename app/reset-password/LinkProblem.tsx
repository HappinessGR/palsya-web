import Link from "next/link";
import { useTranslations } from "next-intl";
import { Icon } from "../components/Icon";

export type LinkProblemKind = "invalid" | "expired" | "used";

/** Shown when a reset link can't be used, both on first load and after a failed submit. */
export function LinkProblem({ kind, ttlMinutes }: { kind: LinkProblemKind; ttlMinutes: number }) {
  const t = useTranslations("passwordReset");
  return (
    <>
      <div role="alert" className="note note-warn">
        <Icon name="alert" className="note-icon" />
        <div>
          <h1 className="display" style={{ fontSize: "var(--t-2xl)", margin: 0 }}>
            {t(`reset.problem.${kind}.title`)}
          </h1>
          <p style={{ marginTop: 8 }}>{t(`reset.problem.${kind}.body`, { minutes: ttlMinutes })}</p>
        </div>
      </div>
      <Link href="/forgot-password" className="btn btn-lg btn-block" style={{ marginTop: 24 }}>
        {t("reset.requestNew")}
      </Link>
      <p className="small" style={{ marginTop: 24, textAlign: "center" }}>
        <Link href="/sign-in">{t("backToSignIn")}</Link>
      </p>
    </>
  );
}
