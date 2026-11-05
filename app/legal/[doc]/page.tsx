import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "../../components/SiteHeader";
import { Footer } from "../../components/Footer";
import { contactEmails, legalUpdated } from "../../lib/content";
import { pageMetadata } from "../../../i18n/metadata";

const DOCS = ["privacy", "terms", "cookies"] as const;
type Doc = (typeof DOCS)[number];

/** Sections per document, in order. Keys live in locales/<locale>/legal.json. */
const SECTIONS: Record<Doc, string[]> = {
  privacy: ["s1", "s2", "s3", "s4", "s5", "s6", "s7"],
  terms: ["s1", "s2", "s3", "s4", "s5", "s6", "s7"],
  cookies: ["s1", "s2", "s3"],
};

const isDoc = (v: string): v is Doc => (DOCS as readonly string[]).includes(v);

type Props = { params: Promise<{ doc: string }> };

export async function generateMetadata({ params }: Props) {
  const { doc } = await params;
  return pageMetadata(`legal.${isDoc(doc) ? doc : "privacy"}.meta`);
}

export default async function LegalPage({ params }: Props) {
  const { doc } = await params;
  if (!isDoc(doc)) notFound();

  const t = await getTranslations("legal");

  return (
    <>
      <SiteHeader />

      <section className="article-hd">
        <div className="wrap-read">
          <h1>{t(`${doc}.h`)}</h1>
          <p className="lead" style={{ marginTop: 14 }}>
            {t.has(`${doc}.sub`) && <>{t(`${doc}.sub`)} </>}
            {t("lastUpdated", { date: new Date(legalUpdated[doc]) })}
          </p>
        </div>
      </section>

      <section className="article-body">
        <div className="wrap-read">
          <div className="prose">
            {SECTIONS[doc].map((s) => (
              <Fragment key={s}>
                <h2>{t(`${doc}.${s}.h`)}</h2>
                <SectionBody doc={doc} s={s} t={t} />
              </Fragment>
            ))}
          </div>

          <div className="row-wrap" style={{ marginTop: 40 }}>
            {DOCS.map((k) => (
              <Link
                key={k}
                className={k === doc ? "btn btn-sm" : "btn btn-sm btn-ghost"}
                href={`/legal/${k}`}
                aria-current={k === doc ? "page" : undefined}
              >
                {t(`tabs.${k}`)}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

type T = Awaited<ReturnType<typeof getTranslations<"legal">>>;

/** A section is either one paragraph (`p`), labelled paragraphs (`p1Strong` + `p1`, …) or plain numbered ones (`p1`, `p2`). */
function SectionBody({ doc, s, t }: { doc: Doc; s: string; t: T }) {
  const base = `${doc}.${s}`;
  if (t.has(`${base}.p`)) return <p>{t(`${base}.p`)}</p>;

  const out = [];
  for (let i = 1; t.has(`${base}.p${i}`); i++) {
    const strong = t.has(`${base}.p${i}Strong`) ? t(`${base}.p${i}Strong`) : null;
    out.push(
      <p key={i}>
        {strong && <strong>{strong} </strong>}
        {t(`${base}.p${i}`, { email: contactEmails.privacy })}
      </p>,
    );
  }
  return <>{out}</>;
}
