import "server-only";
import crypto from "node:crypto";
import { clerkClient } from "@clerk/nextjs/server";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import { passwordResetAttempts, passwordResetTokens } from "../db/schema/password-reset";
import { logAction } from "./audit";
import { isPasswordTooLong, isStrongPassword } from "./password-policy";
import { passwordChangedEmail, passwordResetEmail } from "../../lib/email/templates";
import { sendEmail } from "../../lib/email/mailer";

/**
 * Forgot-password flow. Clerk owns the password (and hashes it with bcrypt);
 * this module owns the emailed one-time link:
 *   - token: 32 random bytes (base64url) — only its SHA-256 is stored
 *   - valid 30 minutes, single use, issuing a new one invalidates older ones
 *   - rate limited per email (3/hour) and per IP (10/hour), counted in Postgres
 *     because serverless instances don't share memory
 */
export const TOKEN_TTL_MINUTES = 30;
const EMAIL_LIMIT_PER_HOUR = 3;
const IP_LIMIT_PER_HOUR = 10;

const sha256 = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
const normaliseEmail = (email: string) => email.trim().toLowerCase();

export function appUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * Handles a reset request. Returns nothing on purpose: the caller shows the
 * same "If an account exists…" message whatever happens here, and runs this
 * after the response (next/server `after`) so timing can't reveal whether the
 * email is registered either.
 */
export async function requestPasswordReset(rawEmail: string, ip: string, locale: string): Promise<void> {
  const email = normaliseEmail(rawEmail);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) return;
  const emailHash = sha256(email);

  const since = sql`now() - interval '1 hour'`;
  const [byEmail, byIp] = await Promise.all([
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(passwordResetAttempts)
      .where(and(eq(passwordResetAttempts.emailHash, emailHash), gt(passwordResetAttempts.createdAt, since))),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(passwordResetAttempts)
      .where(and(eq(passwordResetAttempts.ipAddress, ip), gt(passwordResetAttempts.createdAt, since))),
  ]);
  await db.insert(passwordResetAttempts).values({ emailHash, ipAddress: ip });
  if ((byEmail[0]?.n ?? 0) >= EMAIL_LIMIT_PER_HOUR || (byIp[0]?.n ?? 0) >= IP_LIMIT_PER_HOUR) {
    console.warn(`[password-reset] rate limited (ip ${ip})`);
    return;
  }

  // TODO(auth): the account lookup is Clerk's; users.email mirrors it but may lag the webhook.
  const client = await clerkClient();
  const { data: matches } = await client.users.getUserList({ emailAddress: [email], limit: 1 });
  const clerkUser = matches[0];
  // No account, a Google/Apple-only account (no password to reset) or a banned one: send nothing.
  if (!clerkUser || !clerkUser.passwordEnabled || clerkUser.banned) return;

  const row = await db.query.users.findFirst({ where: { clerkUserId: clerkUser.id } });
  if (row && (row.status === "suspended" || row.deletedAt)) return;

  const token = crypto.randomBytes(32).toString("base64url");
  // Older unused links stop working the moment a new one is issued.
  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(passwordResetTokens.clerkUserId, clerkUser.id), isNull(passwordResetTokens.usedAt)));
  await db.insert(passwordResetTokens).values({
    clerkUserId: clerkUser.id,
    tokenHash: sha256(token),
    expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60_000),
    locale,
  });

  // i18n-ignore -- URL, not UI copy
  const link = `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
  await sendEmail(await passwordResetEmail(email, locale, link, TOKEN_TTL_MINUTES));
  await logAction(row?.id ?? null, "password_reset_requested", row ? { type: "user", id: row.id } : null, { ip });
}

export type TokenState = "valid" | "invalid" | "expired" | "used";

/** Checks a link without using it up (for rendering /reset-password). */
export async function checkResetToken(token: string | undefined): Promise<TokenState> {
  if (!token || token.length > 200) return "invalid";
  const row = await db.query.passwordResetTokens.findFirst({ where: { tokenHash: sha256(token) } });
  if (!row) return "invalid";
  if (row.usedAt) return "used";
  if (row.expiresAt.getTime() <= Date.now()) return "expired";
  return "valid";
}

export type ResetError =
  | TokenState
  | "mismatch"
  | "weak"
  | "too_long"
  | "pwned"
  | "failed";

/**
 * Sets the new password. The token is consumed first, in one conditional
 * UPDATE, so two simultaneous submissions can't both use it; if Clerk then
 * refuses the password the token is released again so the user can retry.
 */
export async function completePasswordReset(
  token: string,
  password: string,
  confirm: string,
): Promise<{ ok: true } | { ok: false; error: ResetError }> {
  if (password !== confirm) return { ok: false, error: "mismatch" };
  if (isPasswordTooLong(password)) return { ok: false, error: "too_long" };
  if (!isStrongPassword(password)) return { ok: false, error: "weak" };

  const tokenHash = sha256(token);
  const [consumed] = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, sql`now()`),
      ),
    )
    .returning();
  if (!consumed) {
    const state = await checkResetToken(token);
    return { ok: false, error: state === "valid" ? "failed" : state };
  }

  const client = await clerkClient();
  try {
    // Clerk hashes the password itself and ends every session of this account.
    await client.users.updateUser(consumed.clerkUserId, { password, signOutOfOtherSessions: true });
  } catch (e) {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: null })
      .where(and(eq(passwordResetTokens.id, consumed.id), gt(passwordResetTokens.expiresAt, sql`now()`)));
    const code = (e as { errors?: { code?: string }[] }).errors?.[0]?.code;
    return { ok: false, error: code === "form_password_pwned" ? "pwned" : "failed" };
  }

  const clerkUser = await client.users.getUser(consumed.clerkUserId);
  const email = clerkUser.emailAddresses.find((a) => a.id === clerkUser.primaryEmailAddressId)?.emailAddress;
  if (email) await sendEmail(await passwordChangedEmail(email, consumed.locale, new Date()));
  const row = await db.query.users.findFirst({ where: { clerkUserId: consumed.clerkUserId } });
  await logAction(row?.id ?? null, "password_reset_completed", row ? { type: "user", id: row.id } : null, {});
  return { ok: true };
}

/** Client IP for rate limiting, from the proxy headers. */
export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  ).slice(0, 64);
}
