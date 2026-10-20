import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "./components/SiteHeader";
import { Footer } from "./components/Footer";
import { DocumentTitle } from "./components/DocumentTitle";

export default async function NotFound() {
  const t = await getTranslations("errors.notFound");

  return (
    <>
      <DocumentTitle title={t("meta.title")} />
      <SiteHeader />
      <main className="wrap" style={{ padding: "var(--s-16, 96px) 0", maxWidth: 640 }}>
        <p className="eyebrow">{t("code")}</p>
        <h1 className="display" style={{ fontSize: "var(--t-3xl)", marginTop: 8 }}>
          {t("title")}
        </h1>
        <p className="lead muted" style={{ marginTop: 16 }}>
          {t("body")}
        </p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
          <Link className="btn" href="/">
            {t("home")}
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
