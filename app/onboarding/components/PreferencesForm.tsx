"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { isLocale, localeNames, locales, type Locale } from "../../../i18n/config";
import { setLocale } from "../../../i18n/actions";
import { rememberLocale } from "../../components/LanguageSwitcher";
import { savePreferences, type PreferencesInput } from "../actions";
import { Icon } from "../../components/Icon";

const TEXT_SIZES: { value: PreferencesInput["textSize"]; labelKey: "sizeNormal" | "sizeLarge" | "sizeXl" }[] = [
  { value: "normal", labelKey: "sizeNormal" },
  { value: "large", labelKey: "sizeLarge" },
  { value: "xl", labelKey: "sizeXl" },
];

export function PreferencesForm({ initial }: { initial: PreferencesInput }) {
  const router = useRouter();
  const t = useTranslations("onboarding.prefs");
  const tNav = useTranslations("onboarding.nav");
  const locale = useLocale() as Locale;
  const [prefs, setPrefs] = useState<PreferencesInput>(initial);
  const [isPending, startTransition] = useTransition();

  function update<K extends keyof PreferencesInput>(key: K, value: PreferencesInput[K]) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      savePreferences(prefs);
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

      <form onSubmit={handleSubmit} style={{ marginTop: 30 }}>
        <div className="card card-pad-lg">
          <h3 className="h-card">{t("remindersTitle")}</h3>
          <p className="small muted mt-4">{t("remindersBody")}</p>
          <label className="switch" style={{ marginTop: 18 }}>
            <input type="checkbox" checked={prefs.remindersOn} onChange={(e) => update("remindersOn", e.target.checked)} />
            <span className="switch-track" />
            <span>{t("remindMeLabel")}</span>
          </label>
          <div className="grid g2" style={{ marginTop: 18, opacity: prefs.remindersOn ? 1 : 0.45, pointerEvents: prefs.remindersOn ? "auto" : "none" }}>
            <div className="field" style={{ margin: 0 }}>
              <label className="label" htmlFor="pf-t1">
                {t("firstSession")}
              </label>
              <input className="input" type="time" id="pf-t1" value={prefs.reminderTime} onChange={(e) => update("reminderTime", e.target.value)} />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label className="label" htmlFor="pf-t2">
                {t("secondSession")}
              </label>
              <input
                className="input"
                type="time"
                id="pf-t2"
                value={prefs.secondReminderTime}
                onChange={(e) => update("secondReminderTime", e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card card-pad-lg" style={{ marginTop: 18 }}>
          <h3 className="h-card">{t("languageTitle")}</h3>
          <p className="small muted mt-4">{t("languageBody", { count: locales.length })}</p>
          <div className="field" style={{ marginTop: 16, marginBottom: 0 }}>
            <label className="label" htmlFor="pf-lang">
              {t("interfaceLanguage")}
            </label>
            <select
              className="select"
              id="pf-lang"
              value={locale}
              onChange={(e) => {
                const next = e.target.value;
                if (!isLocale(next)) return;
                rememberLocale(next);
                void setLocale(next);
              }}
            >
              {locales.map((l) => (
                <option key={l} value={l} lang={l}>
                  {localeNames[l]}
                </option>
              ))}
            </select>
            <p className="hint">{t("languageHint")}</p>
          </div>
        </div>

        <div className="card card-pad-lg" style={{ marginTop: 18 }}>
          <h3 className="h-card">{t("displayTitle")}</h3>
          <div className="field" style={{ marginTop: 16 }}>
            <label className="label">{t("textSize")}</label>
            <div className="seg" role="tablist">
              {TEXT_SIZES.map((size) => (
                <button
                  key={size.value}
                  type="button"
                  role="tab"
                  aria-selected={prefs.textSize === size.value}
                  onClick={() => update("textSize", size.value)}
                >
                  {t(size.labelKey)}
                </button>
              ))}
            </div>
            <div className="hint">{t("sizeHint")}</div>
          </div>
          <label className="switch" style={{ marginTop: 6 }}>
            <input type="checkbox" checked={prefs.cameraMirror} onChange={(e) => update("cameraMirror", e.target.checked)} />
            <span className="switch-track" />
            <span>{t("mirrorLabel")}</span>
          </label>
        </div>

        <div className="card card-pad-lg" style={{ marginTop: 18 }}>
          <h3 className="h-card">{t("emailTitle")}</h3>
          <label className="switch" style={{ marginTop: 14 }}>
            <input type="checkbox" checked={prefs.weeklySummaryEmail} onChange={(e) => update("weeklySummaryEmail", e.target.checked)} />
            <span className="switch-track" />
            <span>{t("weeklySummary")}</span>
          </label>
          <label className="switch" style={{ marginTop: 12 }}>
            <input type="checkbox" checked={prefs.clinicianUpdatesEmail} onChange={(e) => update("clinicianUpdatesEmail", e.target.checked)} />
            <span className="switch-track" />
            <span>{t("clinicianUpdates")}</span>
          </label>
        </div>

        <div className="row-between" style={{ marginTop: 30, flexWrap: "wrap", gap: 12 }}>
          <button type="button" className="btn btn-ghost" onClick={() => router.push("/onboarding/stage")} disabled={isPending}>
            <Icon name="arrow-left" size={17} />
            {tNav("back")}
          </button>
          <button type="submit" className="btn btn-lg" disabled={isPending}>
            {tNav("continue")}
            <Icon name="arrow-right" size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
