import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Icon } from "../../components/Icon";
import { guideHref } from "../../lib/content";
import { libraryPicks } from "../../lib/programme";

export async function LibraryCard({ stage }: { stage: number }) {
  const t = await getTranslations("dashboard.library");
  const tg = await getTranslations("guides.articles");
  const picks = libraryPicks(stage);

  return (
    <div className="card card-pad-lg">
      <div className="card-hd">
        <h3>{t("title")}</h3>
        <Link className="link-arrow small" href="/dashboard/library">
          {t("link")}
          <Icon name="arrow-right" size={14} />
        </Link>
      </div>

      <div className="stack-sm">
        {picks.map((a) => (
          <Link
            className="card card-pad-sm card-flat card-lift row-between"
            href={guideHref(a)}
            style={{ gap: 12 }}
            key={a.slug}
          >
            <div>
              <div className="strong small">{tg(`${a.slug}.title`)}</div>
              <div className="small muted" style={{ marginTop: 2 }}>
                {t("readTime", { minutes: a.read })}
              </div>
            </div>
            <Icon name="chevron-right" size={17} />
          </Link>
        ))}
      </div>

      <div className="divider" />
      <button type="button" className="btn btn-sm btn-ghost btn-block">
        <Icon name="plus" size={16} />
        {t("logNote")}
      </button>
      <p className="small faint" style={{ marginTop: 10 }}>
        {t("logHint")}
      </p>
    </div>
  );
}
