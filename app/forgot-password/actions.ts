"use server";

import { after } from "next/server";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";
import { clientIp, requestPasswordReset } from "../../src/lib/password-reset";

export type ForgotState = { status: "idle" } | { status: "sent" };

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Public (signed-out) action. Always answers "sent" — for malformed, unknown,
 * SSO-only and rate-limited emails alike — so the response never reveals
 * whether an account exists. The lookup and email run after the response.
 */
export async function requestResetAction(_prev: ForgotState, formData: FormData): Promise<ForgotState> {
  const raw = formData.get("email");
  const email = typeof raw === "string" ? raw.trim() : "";

  if (email.length > 0 && email.length <= 254 && EMAIL_SHAPE.test(email)) {
    const ip = clientIp(await headers());
    const locale = await getLocale();
    after(async () => {
      try {
        await requestPasswordReset(email, ip, locale);
      } catch {
        // Never log the address; the failure itself is enough to investigate.
        console.error("[password-reset] request failed");
      }
    });
  }

  return { status: "sent" };
}
