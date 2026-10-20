"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { savePreferences, type SaveState } from "./actions";

export interface PreferenceValues {
  remindersOn: boolean;
  reminderTime: string;
  secondReminderTime: string;
  cameraMirror: boolean;
  textSize: "normal" | "large" | "xl";
  weeklySummaryEmail: boolean;
  clinicianUpdatesEmail: boolean;
}

const TEXT_SIZES = [
  { value: "normal", key: "textSizeNormal" },
  { value: "large", key: "textSizeLarge" },
  { value: "xl", key: "textSizeXl" },
] as const;

/** Ported from the legacy prototype's tReminders() settings tab. */
export function RemindersForm({ initial }: { initial: PreferenceValues }) {
  const t = useTranslations("appSupport.settings.reminders");
  const [state, formAction, pending] = useActionState<SaveState, FormData>(savePreferences, { status: "idle" });
  const [textSize, setTextSize] = useState(initial.textSize);
  const [remindersOn, setRemindersOn] = useState(initial.remindersOn);

  return (
    <form action={formAction}>
      <div className="card card-pad-lg">
        <h3 className="h-card">{t("reminders")}</h3>
        <p className="small muted mt-4">{t("remindersHint")}</p>
        <label className="switch" style={{ marginTop: 16 }}>
          <input
            type="checkbox"
            name="remindersOn"
            checked={remindersOn}
            onChange={(e) => setRemindersOn(e.target.checked)}
          />
          <span className="switch-track" />
          <span>{t("sessionReminders")}</span>
        </label>
        <div className="grid g2" style={{ marginTop: 16, opacity: remindersOn ? 1 : 0.45 }}>
          <div className="field" style={{ margin: 0 }}>
            <label className="label" htmlFor="s-t1">
              {t("firstSession")}
            </label>
            <input className="input" type="time" id="s-t1" name="reminderTime" defaultValue={initial.reminderTime} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label className="label" htmlFor="s-t2">
              {t("secondSession")}
            </label>
            <input className="input" type="time" id="s-t2" name="secondReminderTime" defaultValue={initial.secondReminderTime} />
          </div>
        </div>
        <div className="divider" />
        <label className="switch">
          <input type="checkbox" name="weeklySummaryEmail" defaultChecked={initial.weeklySummaryEmail} />
          <span className="switch-track" />
          <span>{t("weeklySummary")}</span>
        </label>
        <label className="switch" style={{ marginTop: 12 }}>
          <input type="checkbox" name="clinicianUpdatesEmail" defaultChecked={initial.clinicianUpdatesEmail} />
          <span className="switch-track" />
          <span>{t("clinicianUpdates")}</span>
        </label>
      </div>

      <div className="card card-pad-lg" style={{ marginTop: "var(--s-4)" }}>
        <h3 className="h-card">{t("languageAndDisplay")}</h3>
        <div className="field" style={{ marginTop: 16 }}>
          <span className="label">{t("language")}</span>
          <LanguageSwitcher variant="block" />
          <div className="hint">{t("languageHint")}</div>
        </div>
        <div className="field">
          <span className="label">{t("textSize")}</span>
          <input type="hidden" name="textSize" value={textSize} />
          <div className="seg" role="tablist" aria-label={t("textSize")}>
            {TEXT_SIZES.map((o) => (
              <button
                key={o.value}
                type="button"
                role="tab"
                aria-selected={textSize === o.value}
                onClick={() => setTextSize(o.value)}
              >
                {t(o.key)}
              </button>
            ))}
          </div>
        </div>
        <label className="switch">
          <input type="checkbox" name="cameraMirror" defaultChecked={initial.cameraMirror} />
          <span className="switch-track" />
          <span>{t("mirrorCamera")}</span>
        </label>
        <div className="row" style={{ marginTop: 20, gap: 14, flexWrap: "wrap" }}>
          <button className="btn" type="submit" disabled={pending}>
            {t("saveChanges")}
          </button>
          <span className={state.status === "error" ? "small err" : "small muted"} role="status" aria-live="polite">
            {state.status === "saved" ? t("saved") : state.status === "error" ? t("saveFailed") : ""}
          </span>
        </div>
      </div>
    </form>
  );
}
