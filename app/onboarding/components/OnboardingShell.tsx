import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";

const STEP_KEYS = ["welcome", "assessment", "stage", "preferences", "consent", "ready"] as const;

export async function OnboardingShell({
  step,
  wide,
  children,
}: {
  step: 0 | 1 | 2 | 3 | 4 | 5;
  wide?: boolean;
  children: React.ReactNode;
}) {
  const t = await getTranslations("onboarding");
  const tCommon = await getTranslations("common");

  return (
    <div className="page" style={{ maxWidth: wide ? 1180 : 760, margin: "0 auto" }}>
      <header className="row-between" style={{ marginBottom: "var(--s-6)", flexWrap: "wrap", gap: 12 }}>
        <Link className="brand" href="/">
          <span className="brand-name">{tCommon("brand")}</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div className="small muted">
            {t("stepIndicator", { current: step + 1, total: STEP_KEYS.length, label: t(`steps.${STEP_KEYS[step]}`) })}
          </div>
          <LanguageSwitcher />
        </div>
      </header>
      <div className="steps" style={{ marginBottom: "var(--s-7)" }}>
        {STEP_KEYS.map((key, i) => (
          <i key={key} className={i < step ? "done" : i === step ? "now" : ""} />
        ))}
      </div>
      <main>{children}</main>
    </div>
  );
}
