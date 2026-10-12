"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { DocumentTitle } from "./components/DocumentTitle";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useTranslations("errors.error");

  return (
    <main className="wrap" style={{ padding: "var(--s-16, 96px) 0", maxWidth: 640 }}>
      <DocumentTitle title={t("title")} />
      <h1 className="display" style={{ fontSize: "var(--t-3xl)" }}>
        {t("title")}
      </h1>
      <p className="lead muted" style={{ marginTop: 16 }}>
        {t("body")}
      </p>
      {error.digest && <p className="small muted" style={{ marginTop: 8 }}>{t("reference", { digest: error.digest })}</p>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
        <button type="button" className="btn" onClick={() => retry()}>
          {t("retry")}
        </button>
        <Link className="btn btn-ghost" href="/">
          {t("home")}
        </Link>
      </div>
    </main>
  );
}
