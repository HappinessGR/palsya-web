"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Icon } from "../components/Icon";
import { localeNames, locales, type Locale } from "../../i18n/config";
import { sendContactAction, type ContactState } from "./actions";
import { CONTACT_TOPICS, MESSAGE_MAX } from "./shared";

export function ContactForm({ defaultLang }: { defaultLang: Locale }) {
  const t = useTranslations("contact");
  const [state, formAction, pending] = useActionState<ContactState, FormData>(
    sendContactAction,
    { status: "idle" },
  );

  if (state.status === "sent") {
    return (
      <div className="contact-form contact-sent" role="status">
        <div className="empty">
          <Icon name="check-circle" size={30} />
          <p className="strong">{t("sent.title")}</p>
          <p className="small muted">
            {t("sent.body", {
              language:
                localeNames[state.lang as Locale] ?? localeNames[defaultLang],
            })}
          </p>
        </div>
      </div>
    );
  }

  // React resets the form after the action runs; refill it from the returned values on error.
  const v = state.status === "error" ? state.values : null;

  return (
    <form
      className="contact-form"
      action={formAction}
      key={state.status === "error" ? JSON.stringify(v) : "new"}
    >
      <h2 className="sr-only">{t("form.title")}</h2>
      <div className="stack" style={{ marginTop: 20 }}>
        {state.status === "error" && (
          <div className="note note-warn" role="alert">
            <Icon name="alert" size={19} className="note-icon" />
            <div className="small">
              {t(`errors.${state.error}`, { max: MESSAGE_MAX })}
            </div>
          </div>
        )}

        <div className="form-pair">
          <div className="field">
            <label className="label" htmlFor="c-first">
              {t("form.firstName")}
            </label>
            <input
              className="input"
              id="c-first"
              name="firstName"
              autoComplete="given-name"
              maxLength={80}
              required
              defaultValue={v?.firstName}
            />
          </div>
          <div className="field">
            <label className="label" htmlFor="c-last">
              {t("form.lastName")}
            </label>
            <input
              className="input"
              id="c-last"
              name="lastName"
              autoComplete="family-name"
              maxLength={80}
              defaultValue={v?.lastName}
            />
          </div>
        </div>

        <div className="form-pair">
          <div className="field">
            <label className="label" htmlFor="c-email">
              {t("form.email")}
            </label>
            <input
              className="input"
              id="c-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              required
              defaultValue={v?.email}
            />
          </div>

          <div className="field">
            <label className="label" htmlFor="c-lang">
              {t("form.replyIn")}
            </label>
            <select
              className="select"
              id="c-lang"
              name="lang"
              defaultValue={v?.lang ?? defaultLang}
            >
              {locales.map((l) => (
                <option key={l} value={l} lang={l}>
                  {localeNames[l]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="c-topic">
            {t("form.topic")}
          </label>
          <select
            className="select"
            id="c-topic"
            name="topic"
            defaultValue={v?.topic ?? CONTACT_TOPICS[0]}
          >
            {CONTACT_TOPICS.map((k) => (
              <option key={k} value={k}>
                {t(`form.topics.${k}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="label" htmlFor="c-msg">
            {t("form.message")}
          </label>
          <textarea
            className="textarea"
            id="c-msg"
            name="msg"
            rows={6}
            maxLength={MESSAGE_MAX}
            required
            aria-describedby="c-msg-hint"
            defaultValue={v?.msg}
          />
          <div className="hint" id="c-msg-hint">
            {t("form.messageHint")}
          </div>
        </div>

        {/* Honeypot for bots: hidden from people and assistive tech. */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "-10000px",
            width: 1,
            height: 1,
            overflow: "hidden",
          }}
        >
          <input name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <p className="small mt-0 contact-respond">
          <Icon name="clock" size={14} />
          {t("form.respond")}
        </p>

        <button
          className="btn btn-block btn-lg contact-submit"
          type="submit"
          disabled={pending}
          aria-disabled={pending}
        >
          {pending ? t("form.sending") : t("form.submit")}
        </button>
        <p className="small mt-0 contact-form-note">{t("form.note")}</p>
      </div>
    </form>
  );
}
