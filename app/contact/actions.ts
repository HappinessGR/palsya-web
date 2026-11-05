"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { sendEmail } from "../../lib/email/mailer";
import { contactMessageEmail } from "../../lib/email/templates";
import { clientIp } from "../../src/lib/password-reset";
import { defaultLocale, isLocale, localeNames, locales } from "../../i18n/config";
import { CONTACT_TOPICS, MESSAGE_MAX } from "./shared";


export type ContactValues = { firstName: string; lastName: string; email: string; topic: string; lang: string; msg: string };
export type ContactError = "fill" | "email" | "tooLong" | "rateLimited" | "failed";
export type ContactState =
  | { status: "idle" }
  | { status: "error"; error: ContactError; values: ContactValues }
  | { status: "sent"; lang: string };

const schema = z.object({
  // No line breaks in names: they are shown in the email to support.
  firstName: z.string().trim().min(1).max(80).transform((s) => s.replace(/[\r\n]+/g, " ")),
  lastName: z.string().trim().max(80).transform((s) => s.replace(/[\r\n]+/g, " ")),
  email: z.string().trim().min(1).max(254),
  topic: z.enum(CONTACT_TOPICS),
  lang: z.enum(locales),
  msg: z.string().trim().min(1),
});

// Per-IP limit, in memory: enough to stop a script hammering the form from one
// address on a single instance. Not shared across instances or restarts.
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((at) => now - at < WINDOW_MS);
  if (hits.length >= MAX_PER_WINDOW) {
    recent.set(ip, hits);
    return true;
  }
  hits.push(now);
  recent.set(ip, hits);
  if (recent.size > 10_000) recent.clear();
  return false;
}

/** Public (signed-out) action behind the /contact form. Sends the message to the support inbox. */
export async function sendContactAction(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const str = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  const values: ContactValues = {
    firstName: str("firstName"),
    lastName: str("lastName"),
    email: str("email"),
    topic: str("topic"),
    lang: isLocale(str("lang")) ? str("lang") : defaultLocale,
    msg: str("msg"),
  };
  const fail = (error: ContactError): ContactState => ({ status: "error", error, values });

  // Honeypot: real visitors never see or fill this field. Pretend it worked.
  if (str("website")) return { status: "sent", lang: values.lang };

  const parsed = schema.safeParse(values);
  if (!parsed.success) return fail("fill");
  const data = parsed.data;
  if (data.msg.length > MESSAGE_MAX) return fail("tooLong");
  if (!z.string().email().safeParse(data.email).success) return fail("email");

  if (rateLimited(clientIp(await headers()))) return fail("rateLimited");

  // Support reads English: send the topic label in English, the language by name.
  const tEn = await getTranslations({ locale: defaultLocale, namespace: "contact" });
  try {
    await sendEmail(
      await contactMessageEmail({
        name: [data.firstName, data.lastName].filter(Boolean).join(" "),
        email: data.email,
        topic: tEn(`form.topics.${data.topic}`),
        language: localeNames[data.lang],
        message: data.msg,
      }),
    );
  } catch {
    // Never log the visitor's address or message.
    console.error("[contact] sending the message failed");
    return fail("failed");
  }

  return { status: "sent", lang: data.lang };
}
