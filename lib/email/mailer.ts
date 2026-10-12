import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import nodemailer, { type Transporter } from "nodemailer";

export interface OutgoingEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Delivery, chosen from the environment:
 *   - SMTP_HOST set            → real SMTP (SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE, MAIL_FROM).
 *   - otherwise, development   → the whole email (including links) is printed to the server console.
 *   - MAIL_OUTBOX_DIR set      → additionally written there as JSON, one file per email
 *                                (used by scripts/role-tests.mjs to follow reset/invite links).
 * In production without SMTP nothing is printed — the email would contain a live reset link.
 *
 * TODO(email): point SMTP_* at the production provider (e.g. Postmark/SES SMTP credentials)
 * and set MAIL_FROM to a verified sender on the palsya domain.
 */
let transporter: Transporter | null = null;

function smtp(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });
  return transporter;
}

export async function sendEmail(email: OutgoingEmail): Promise<void> {
  // i18n-ignore -- default sender address, not UI copy
  const from = process.env.MAIL_FROM ?? "Palsya <no-reply@palsya.localhost>";

  if (process.env.MAIL_OUTBOX_DIR) {
    const dir = path.resolve(process.env.MAIL_OUTBOX_DIR);
    await fs.mkdir(dir, { recursive: true });
    const name = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}.json`;
    await fs.writeFile(path.join(dir, name), JSON.stringify({ from, ...email, sentAt: new Date().toISOString() }, null, 2));
  }

  const transport = smtp();
  if (transport) {
    await transport.sendMail({ from, ...email });
    return;
  }

  if (process.env.NODE_ENV === "production" && !process.env.MAIL_OUTBOX_DIR) {
    console.error(`[mail] SMTP_HOST is not configured; email "${email.subject}" to ${email.to} was NOT sent.`);
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(
      [
        "",
        "──────── [mail] development: not sent, printed instead ────────",
        `From:    ${from}`,
        `To:      ${email.to}`,
        `Subject: ${email.subject}`,
        "",
        email.text,
        "────────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
  }
}
