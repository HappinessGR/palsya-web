/**
 * Small helpers shared by the admin pages, server actions and /api/admin routes.
 * No secrets or DB access here — validation and the list of result codes only.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CLERK_INVITATION_RE = /^inv_[A-Za-z0-9]{10,64}$/;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

export function isInvitationId(value: unknown): value is string {
  return typeof value === "string" && CLERK_INVITATION_RE.test(value);
}

/** Error codes the admin UI knows how to show (admin.errors.<code>). */
export const ADMIN_ERROR_CODES = [
  "not_signed_in",
  "forbidden",
  "invalid_input",
  "not_found",
  "invalid_role",
  "invalid_locale",
  "last_admin",
  "cannot_change_self_status",
  "not_a_patient",
  "not_a_clinician",
  "invalid_email",
  "already_exists",
  "invite_failed",
] as const;
export type AdminErrorCode = (typeof ADMIN_ERROR_CODES)[number];

export function toErrorCode(value: unknown): AdminErrorCode | null {
  return typeof value === "string" && (ADMIN_ERROR_CODES as readonly string[]).includes(value)
    ? (value as AdminErrorCode)
    : null;
}

/** Reads one string value from Next's searchParams object. */
export function param(sp: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const v = sp[key];
  return Array.isArray(v) ? v[0] : v;
}

/** Parses a JSON object request body; null when missing, malformed or not an object. */
export async function readJsonObject(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** HTTP status for each admin error code returned by src/lib/user-admin.ts. */
export const ADMIN_ERROR_STATUS: Record<string, number> = {
  not_found: 404,
  not_a_patient: 404,
  invalid_role: 400,
  invalid_email: 400,
  invalid_locale: 400,
  not_a_clinician: 400,
  last_admin: 409,
  cannot_change_self_status: 409,
  already_exists: 409,
  invite_failed: 502,
};
