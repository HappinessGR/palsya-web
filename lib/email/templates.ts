import "server-only";
import { createTranslator } from "next-intl";
import { defaultLocale, isLocale, type Locale } from "../../i18n/config";
import type { OutgoingEmail } from "./mailer";

/**
 * Transactional emails, in the recipient's language. Text lives in
 * locales/<locale>/emails.json; this file only lays it out, in Palsya's
 * colours (teal #0f9488 buttons, warm off-white background), as HTML with a
 * plain-text alternative. Inline styles only — email clients drop <style>.
 */

async function translatorFor(locale: string) {
  const l: Locale = isLocale(locale) ? locale : defaultLocale;
  const [emails, fallback] = await Promise.all([
    import(`../../locales/${l}/emails.json`).then((m) => m.default).catch(() => ({})),
    import(`../../locales/en/emails.json`).then((m) => m.default),
  ]);
  return createTranslator({ locale: l, messages: { emails: { ...fallback, ...emails } }, namespace: "emails" });
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

interface Layout {
  locale: string;
  preheader: string;
  heading: string;
  paragraphs: string[];
  button?: { label: string; url: string };
  afterButton?: string[];
  footer: string;
}

function render(to: string, subject: string, l: Layout): OutgoingEmail {
  const p = (t: string) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#334155">${esc(t)}</p>`;
  const button = l.button
    ? `<p style="margin:24px 0"><a href="${esc(l.button.url)}" style="display:inline-block;background:#0f9488;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:14px 26px;border-radius:999px">${esc(l.button.label)}</a></p>
       <p style="margin:0 0 16px;font-size:13px;line-height:1.5;color:#64748b;word-break:break-all">${esc(l.button.url)}</p>`
    : "";
  const html = `<!doctype html>
<html lang="${esc(l.locale)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#faf8f5;font-family:Inter,Segoe UI,Helvetica,Arial,sans-serif">
<span style="display:none;max-height:0;overflow:hidden">${esc(l.preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#faf8f5;padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e7e2da;border-radius:16px;padding:32px">
<tr><td>
<p style="margin:0 0 24px;font-family:Newsreader,Georgia,serif;font-size:22px;font-weight:600;color:#0f172a">Palsya</p>
<h1 style="margin:0 0 16px;font-family:Newsreader,Georgia,serif;font-size:26px;font-weight:500;color:#0f172a">${esc(l.heading)}</h1>
${l.paragraphs.map(p).join("\n")}
${button}
${(l.afterButton ?? []).map(p).join("\n")}
<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #e7e2da;font-size:13px;line-height:1.5;color:#64748b">${esc(l.footer)}</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    l.heading,
    "",
    ...l.paragraphs.flatMap((t) => [t, ""]),
    ...(l.button ? [`${l.button.label}: ${l.button.url}`, ""] : []),
    ...(l.afterButton ?? []).flatMap((t) => [t, ""]),
    "—",
    l.footer,
  ].join("\n");
  return { to, subject, html, text };
}

const support = () => process.env.SUPPORT_EMAIL ?? "support@palsya.health";

export async function passwordResetEmail(to: string, locale: string, url: string, minutes: number) {
  const t = await translatorFor(locale);
  return render(to, t("reset.subject"), {
    locale,
    preheader: t("reset.preheader", { minutes }),
    heading: t("reset.heading"),
    paragraphs: [t("reset.body", { minutes })],
    button: { label: t("reset.button"), url },
    afterButton: [t("reset.ignore")],
    footer: t("footer", { support: support() }),
  });
}

export async function passwordChangedEmail(to: string, locale: string, when: Date) {
  const t = await translatorFor(locale);
  return render(to, t("changed.subject"), {
    locale,
    preheader: t("changed.preheader"),
    heading: t("changed.heading"),
    paragraphs: [t("changed.body", { when }), t("changed.notYou", { support: support() })],
    footer: t("footer", { support: support() }),
  });
}

export async function invitationEmail(
  to: string,
  locale: string,
  url: string,
  role: "clinician" | "admin",
  inviterName: string,
) {
  const t = await translatorFor(locale);
  return render(to, t("invite.subject", { role }), {
    locale,
    preheader: t("invite.preheader", { role }),
    heading: t("invite.heading", { role }),
    paragraphs: [t("invite.body", { role, inviter: inviterName })],
    button: { label: t("invite.button"), url },
    afterButton: [t("invite.ignore")],
    footer: t("footer", { support: support() }),
  });
}
