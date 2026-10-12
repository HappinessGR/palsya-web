import Link from "next/link";
import { useTranslations } from "next-intl";

export function AuthSidePanel({
  title,
  points,
  quote,
}: {
  title: string;
  points: string[];
  quote?: { q: string; who: string };
}) {
  const t = useTranslations("common");
  return (
    <div className="auth-side">
      <Link className="brand" href="/">
        <span className="brand-name">{t("brand")}</span>
      </Link>
      <h2 className="display" style={{ fontSize: "var(--t-3xl)", marginTop: "var(--s-6)" }}>
        {title}
      </h2>
      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
        {points.map((p) => (
          <li key={p} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <span style={{ color: "var(--brand)", flex: "none", marginTop: 2 }}>✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {quote && (
        <div className="card card-pad-lg card-flat" style={{ marginTop: "var(--s-4)" }}>
          <p className="quote" style={{ fontSize: "var(--t-lg)" }}>
            &ldquo;{quote.q}&rdquo;
          </p>
          <div className="small muted" style={{ marginTop: 12 }}>
            {quote.who}
          </div>
        </div>
      )}
    </div>
  );
}
