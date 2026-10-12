"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { saveConsents, type ConsentInput } from "../actions";
import { Icon } from "../../components/Icon";

const ROWS: { key: keyof ConsentInput; required: boolean }[] = [
  { key: "dataProcessing", required: true },
  { key: "photoStorageAnalysis", required: true },
  { key: "photoKeep", required: false },
  { key: "clinicianShare", required: false },
  { key: "researchOptIn", required: false },
  { key: "marketing", required: false },
];

const MESSAGE_KEY: Record<keyof ConsentInput, string> = {
  dataProcessing: "dataProcessing",
  photoStorageAnalysis: "photoStorage",
  photoKeep: "photoKeep",
  clinicianShare: "clinicianShare",
  researchOptIn: "researchOptIn",
  marketing: "marketing",
};

export function ConsentForm() {
  const router = useRouter();
  const t = useTranslations("onboarding.consent");
  const tNav = useTranslations("onboarding.nav");
  const [consents, setConsents] = useState<ConsentInput>({
    dataProcessing: false,
    photoStorageAnalysis: false,
    photoKeep: false,
    clinicianShare: false,
    researchOptIn: false,
    marketing: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consents.dataProcessing || !consents.photoStorageAnalysis) {
      setError(t("errRequired"));
      return;
    }
    setError(null);
    startTransition(() => {
      saveConsents(consents);
    });
  }

  return (
    <div className="wrap-read" style={{ padding: 0 }}>
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="display" style={{ fontSize: "var(--t-3xl)", marginTop: 12 }}>
        {t("heading")}
      </h1>
      <p className="lead" style={{ marginTop: 14 }}>
        {t("lead")}
      </p>

      <div className="note note-clinical" style={{ marginTop: 24 }}>
        <Icon name="shield" size={20} className="note-icon" />
        <div>{t("gdprNote")}</div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginTop: 26 }}>
        {ROWS.map(({ key, required }) => (
          <div className="check-row" style={{ marginBottom: 12 }} key={key}>
            <input
              type="checkbox"
              id={`cs-${key}`}
              checked={consents[key]}
              onChange={(e) => setConsents((prev) => ({ ...prev, [key]: e.target.checked }))}
            />
            <label htmlFor={`cs-${key}`}>
              <span className="strong">{t(`${MESSAGE_KEY[key]}.title`)}</span>{" "}
              <span className={required ? "badge badge-brand" : "badge badge-outline"}>{required ? t("required") : t("optional")}</span>
              <div
                className="small muted"
                style={{ marginTop: 5 }}
                dangerouslySetInnerHTML={{ __html: t.raw(`${MESSAGE_KEY[key]}.body`) as string }}
              />
            </label>
          </div>
        ))}

        {error && <div className="err">{error}</div>}

        <div className="note note-warn" style={{ marginTop: 18 }}>
          <Icon name="info" size={20} className="note-icon" />
          <div dangerouslySetInnerHTML={{ __html: t.raw("laterNote") as string }} />
        </div>

        <p className="small muted" style={{ marginTop: 18 }}>
          {t.rich("termsAgreement", {
            link: (c) => (
              <a href="/about" target="_blank" rel="noreferrer">
                {c}
              </a>
            ),
          })}
        </p>

        <div className="row-between" style={{ marginTop: 30, flexWrap: "wrap", gap: 12 }}>
          <button type="button" className="btn btn-ghost" onClick={() => router.push("/onboarding/preferences")} disabled={isPending}>
            <Icon name="arrow-left" size={17} />
            {tNav("back")}
          </button>
          <button type="submit" className="btn btn-lg" disabled={isPending}>
            {t("submit")}
            <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
