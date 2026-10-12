import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { patientProfiles, staffProfiles, users } from "../db/schema/users";
import { can, isAppRole, ROLE_HOME, toAppRole, type AppRole, type Permission } from "./permissions";

/**
 * Who is making this request, resolved on the server for every protected
 * page, action and API route:
 *   1. Clerk's signed session (verified by `auth()`) says which account it is.
 *   2. The role and status come from users.role / users.status in Postgres.
 * Never from the browser. Cached per request.
 */
export interface Actor {
  userId: string; // users.id
  clerkUserId: string;
  role: AppRole;
  email: string;
  fullName: string;
  /** Suspended or soft-deleted accounts are signed in with Clerk but get no access. */
  blocked: boolean;
}

export const getActor = cache(async (): Promise<Actor | null> => {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return null;

  let row = await db.query.users.findFirst({ where: { clerkUserId } });
  if (!row) row = (await provisionUser(clerkUserId)) ?? undefined;
  if (!row) return null;

  const role = toAppRole(row.role) ?? "patient";
  return {
    userId: row.id,
    clerkUserId,
    role,
    email: row.email,
    fullName: row.fullName,
    blocked: row.status === "suspended" || row.deletedAt !== null,
  };
});

/**
 * The role an invitation granted. Only our own server writes publicMetadata
 * (src/lib/user-admin.ts inviteUser sets `{ role, invitedVia: "invitation" }` on the
 * Clerk invitation, which Clerk copies onto the new user). Metadata without
 * `invitedVia` came from the old self-service flow and is not trusted.
 */
export function invitedRole(publicMetadata: unknown): AppRole | null {
  const meta = (publicMetadata ?? {}) as { role?: unknown; invitedVia?: unknown };
  if (meta.invitedVia !== "invitation") return null;
  return isAppRole(meta.role) ? meta.role : null;
}

type UserRow = typeof users.$inferSelect;

/**
 * Creates the users row for a Clerk account that has none yet (first sign-in
 * after sign-up, or an account created before the webhook existed). The role
 * is decided here, on the server: an invited role, otherwise "patient".
 */
async function provisionUser(clerkUserId: string): Promise<UserRow | null> {
  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== clerkUserId) return null;

  const role = invitedRole(clerkUser.publicMetadata) ?? "patient";
  const primaryEmail = clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId);
  const email = primaryEmail?.emailAddress ?? `${clerkUser.id}@unknown.palsya.invalid`;
  const fullName =
    // i18n-ignore -- stored DB placeholder name, never shown as UI copy
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email.split("@")[0] || "Palsya user";

  await db
    .insert(users)
    .values({
      clerkUserId,
      email,
      fullName,
      role,
      status: "active",
      mfaEnabled: clerkUser.twoFactorEnabled ?? false,
      emailVerifiedAt: primaryEmail?.verification?.status === "verified" ? new Date() : null,
    })
    .onConflictDoNothing({ target: users.clerkUserId });

  const row = await db.query.users.findFirst({ where: { clerkUserId } });
  if (!row) return null;

  if (role === "patient") {
    await db.insert(patientProfiles).values({ userId: row.id }).onConflictDoNothing({ target: patientProfiles.userId });
  } else {
    await db
      .insert(staffProfiles)
      // i18n-ignore -- staff_profiles.title stored value
      .values({ userId: row.id, title: role === "admin" ? "Administrator" : "Clinician", employmentStatus: "active" })
      .onConflictDoNothing({ target: staffProfiles.userId });
  }
  return row;
}

/** Page / layout guard. Signed out → /login; wrong role → the user's own dashboard. */
export async function requirePagePermission(permission: Permission): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.blocked) redirect("/login?error=account_suspended");
  if (!can(actor.role, permission)) redirect(ROLE_HOME[actor.role]);
  return actor;
}

/** For signed-in-only pages that aren't tied to one role (e.g. /me). */
export async function requireSignedIn(): Promise<Actor> {
  const actor = await getActor();
  if (!actor) redirect("/login");
  if (actor.blocked) redirect("/login?error=account_suspended");
  return actor;
}

/** Public pages (/, /login, /sign-up): a signed-in, active user goes to their own dashboard. */
export async function redirectSignedInToDashboard(): Promise<void> {
  const actor = await getActor();
  if (actor && !actor.blocked) redirect(ROLE_HOME[actor.role]);
}

export type ApiAuthResult = { ok: true; actor: Actor } | { ok: false; response: NextResponse };

/** API route guard: 401 when signed out, 403 when the role lacks the permission. */
export async function authorizeApi(permission: Permission): Promise<ApiAuthResult> {
  const actor = await getActor();
  if (!actor) return { ok: false, response: NextResponse.json({ error: "not_signed_in" }, { status: 401 }) };
  if (actor.blocked || !can(actor.role, permission)) {
    return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { ok: true, actor };
}

/** Server-action guard: same rules as authorizeApi, as a plain result. */
export async function authorizeAction(
  permission: Permission,
): Promise<{ ok: true; actor: Actor } | { ok: false; error: "not_signed_in" | "forbidden" }> {
  const actor = await getActor();
  if (!actor) return { ok: false, error: "not_signed_in" };
  if (actor.blocked || !can(actor.role, permission)) return { ok: false, error: "forbidden" };
  return { ok: true, actor };
}

/**
 * Record-level check for one patient: admins see everyone, clinicians only
 * patients assigned to them, patients only themselves. Returns the profile, or
 * null when this actor may not see it (callers answer 404/403 — never leak
 * whether the patient exists).
 */
export async function assertCanAccessPatient(actor: Actor, patientProfileId: string) {
  const profile = await db.query.patientProfiles.findFirst({ where: { id: patientProfileId } });
  if (!profile) return null;
  if (can(actor.role, "patients:all:read")) return profile;
  if (can(actor.role, "patients:assigned:read") && profile.assignedClinicianId === actor.userId) return profile;
  if (can(actor.role, "self:programme") && profile.userId === actor.userId) return profile;
  return null;
}

/** Active clinicians, for the admin's assignment picker. */
export async function listActiveClinicians() {
  return db
    .select({ id: users.id, fullName: users.fullName, email: users.email })
    .from(users)
    .where(and(eq(users.role, "clinician"), eq(users.status, "active")));
}
