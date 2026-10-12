import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { eq, sql } from "drizzle-orm";
import { db } from "../db";
import { patientProfiles, staffProfiles, users } from "../db/schema/users";
import { logAction } from "./audit";
import type { Actor } from "./authz";
import { INVITABLE_ROLES, isAppRole, toAppRole, type AppRole } from "./permissions";
import { invitationEmail } from "../../lib/email/templates";
import { sendEmail } from "../../lib/email/mailer";

/**
 * Every account-management operation an admin can perform. Callers (admin API
 * routes and server actions) must already have checked the permission with
 * authorizeApi / authorizeAction — these functions enforce the data rules
 * (last admin, valid targets) and write the audit log.
 */
export type AdminResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { value: T }))
  | { ok: false; error: AdminError };

export type AdminError =
  | "not_found"
  | "invalid_role"
  | "last_admin"
  | "cannot_change_self_status"
  | "not_a_patient"
  | "not_a_clinician"
  | "invalid_email"
  | "already_exists"
  | "invite_failed";

const ADMIN_DB_ROLES = sql`('admin', 'superuser')`;

/**
 * Changes a user's role. Removing the admin role only succeeds while another
 * active admin remains — checked in the same UPDATE statement, so two admins
 * demoting each other at once can't both win.
 */
export async function changeRole(actor: Actor, targetUserId: string, newRole: unknown): Promise<AdminResult> {
  if (!isAppRole(newRole)) return { ok: false, error: "invalid_role" };
  const target = await db.query.users.findFirst({ where: { id: targetUserId } });
  if (!target || target.deletedAt) return { ok: false, error: "not_found" };
  const oldRole = toAppRole(target.role) ?? "patient";
  if (oldRole === newRole) return { ok: true };

  const updated =
    oldRole === "admin"
      ? await db.execute(sql`
          UPDATE ${users} SET role = ${newRole}, updated_at = now()
          WHERE id = ${targetUserId}
            AND (SELECT count(*) FROM ${users} other
                 WHERE other.role IN ${ADMIN_DB_ROLES} AND other.status <> 'suspended'
                   AND other.deleted_at IS NULL AND other.id <> ${targetUserId}) > 0
          RETURNING id`)
      : await db.execute(sql`UPDATE ${users} SET role = ${newRole}, updated_at = now() WHERE id = ${targetUserId} RETURNING id`);
  if (rowCount(updated) === 0) return { ok: false, error: "last_admin" };

  await ensureProfileFor(targetUserId, newRole);
  // A clinician who stops being one no longer looks after anyone.
  let unassigned = 0;
  if (oldRole === "clinician") {
    const res = await db
      .update(patientProfiles)
      .set({ assignedClinicianId: null, updatedAt: new Date() })
      .where(eq(patientProfiles.assignedClinicianId, targetUserId))
      .returning({ id: patientProfiles.id });
    unassigned = res.length;
  }

  await mirrorRoleToClerk(target.clerkUserId, newRole);
  await logAction(actor.userId, "role_changed", { type: "user", id: targetUserId }, {
    from: oldRole,
    to: newRole,
    email: target.email,
    patientsUnassigned: unassigned,
  });
  return { ok: true };
}

/**
 * Deactivates (suspends) or reactivates an account. Suspension also bans the
 * user in Clerk, which ends their sessions and blocks new sign-ins. The last
 * active admin can't be suspended, and nobody changes their own status.
 */
export async function setStatus(actor: Actor, targetUserId: string, status: unknown): Promise<AdminResult> {
  if (status !== "active" && status !== "suspended") return { ok: false, error: "invalid_role" };
  if (targetUserId === actor.userId) return { ok: false, error: "cannot_change_self_status" };
  const target = await db.query.users.findFirst({ where: { id: targetUserId } });
  if (!target || target.deletedAt) return { ok: false, error: "not_found" };
  if (target.status === status) return { ok: true };

  const updated =
    status === "suspended" && toAppRole(target.role) === "admin"
      ? await db.execute(sql`
          UPDATE ${users} SET status = 'suspended', updated_at = now()
          WHERE id = ${targetUserId}
            AND (SELECT count(*) FROM ${users} other
                 WHERE other.role IN ${ADMIN_DB_ROLES} AND other.status <> 'suspended'
                   AND other.deleted_at IS NULL AND other.id <> ${targetUserId}) > 0
          RETURNING id`)
      : await db.execute(sql`UPDATE ${users} SET status = ${status}, updated_at = now() WHERE id = ${targetUserId} RETURNING id`);
  if (rowCount(updated) === 0) return { ok: false, error: "last_admin" };

  const client = await clerkClient();
  if (status === "suspended") await client.users.banUser(target.clerkUserId);
  else await client.users.unbanUser(target.clerkUserId);

  await logAction(actor.userId, status === "suspended" ? "user_deactivated" : "user_reactivated", {
    type: "user",
    id: targetUserId,
  }, { email: target.email, from: target.status, to: status });
  return { ok: true };
}

/** Assigns a patient to a clinician (or unassigns with clinicianUserId = null). */
export async function assignClinician(
  actor: Actor,
  patientProfileId: string,
  clinicianUserId: string | null,
): Promise<AdminResult> {
  const profile = await db.query.patientProfiles.findFirst({ where: { id: patientProfileId } });
  if (!profile) return { ok: false, error: "not_a_patient" };
  if (clinicianUserId) {
    const clinician = await db.query.users.findFirst({ where: { id: clinicianUserId } });
    if (!clinician || clinician.role !== "clinician" || clinician.status === "suspended" || clinician.deletedAt) {
      return { ok: false, error: "not_a_clinician" };
    }
  }
  if (profile.assignedClinicianId === clinicianUserId) return { ok: true };

  await db
    .update(patientProfiles)
    .set({ assignedClinicianId: clinicianUserId, updatedAt: new Date() })
    .where(eq(patientProfiles.id, patientProfileId));
  await logAction(actor.userId, "patient_assigned", { type: "patient", id: patientProfileId }, {
    from: profile.assignedClinicianId,
    to: clinicianUserId,
  });
  return { ok: true };
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Invites a clinician or admin. The role travels in the Clerk invitation's
 * publicMetadata (set here, server-side, never by the invitee), and Clerk copies
 * it onto the account when the invitation is accepted; getActor() then
 * provisions the users row with that role. Clerk's own email is turned off
 * (notify: false) so the invitation goes out in the admin-chosen language
 * through our mailer.
 */
export async function inviteUser(
  actor: Actor,
  input: { email: unknown; role: unknown; locale: unknown },
  appUrl: string,
  defaultLocale: string,
): Promise<AdminResult<{ invitationId: string }>> {
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) return { ok: false, error: "invalid_email" };
  if (!isAppRole(input.role) || !INVITABLE_ROLES.includes(input.role)) return { ok: false, error: "invalid_role" };
  const role = input.role as "clinician" | "admin";
  const locale = typeof input.locale === "string" ? input.locale : defaultLocale;

  if (await db.query.users.findFirst({ where: { email } })) return { ok: false, error: "already_exists" };

  const client = await clerkClient();
  let invitation;
  try {
    invitation = await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role, invitedVia: "invitation", invitedBy: actor.userId },
      redirectUrl: `${appUrl}/accept-invite`,
      notify: false,
      ignoreExisting: true,
    });
  } catch (e) {
    const code = (e as { errors?: { code?: string }[] }).errors?.[0]?.code;
    return { ok: false, error: code === "form_identifier_exists" ? "already_exists" : "invite_failed" };
  }
  if (!invitation.url) return { ok: false, error: "invite_failed" };

  await sendEmail(await invitationEmail(email, locale, invitation.url, role, actor.fullName));
  await logAction(actor.userId, "user_invited", { type: "invitation" }, {
    invitationId: invitation.id,
    email,
    role,
    locale,
  });
  return { ok: true, value: { invitationId: invitation.id } };
}

export async function revokeInvitation(actor: Actor, invitationId: string): Promise<AdminResult> {
  const client = await clerkClient();
  try {
    const inv = await client.invitations.revokeInvitation(invitationId);
    await logAction(actor.userId, "invitation_revoked", { type: "invitation" }, {
      invitationId,
      email: inv.emailAddress,
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "not_found" };
  }
}

export async function listPendingInvitations() {
  const client = await clerkClient();
  const { data } = await client.invitations.getInvitationList({ status: "pending", limit: 100 });
  return data
    .filter((i) => (i.publicMetadata as { invitedVia?: unknown } | null)?.invitedVia === "invitation")
    .map((i) => ({
      id: i.id,
      email: i.emailAddress,
      role: (i.publicMetadata as { role?: string }).role ?? "clinician",
      createdAt: new Date(i.createdAt),
    }));
}

/** All non-deleted users with their clinician assignment, for the admin list. */
export async function listUsers() {
  return db.query.users.findMany({
    where: { deletedAt: { isNull: true } },
    with: { patientProfile: true },
    orderBy: { createdAt: "desc" },
  });
}

async function ensureProfileFor(userId: string, role: AppRole) {
  if (role === "patient") {
    await db.insert(patientProfiles).values({ userId }).onConflictDoNothing({ target: patientProfiles.userId });
  } else {
    await db
      .insert(staffProfiles)
      // i18n-ignore -- staff_profiles.title stored value
      .values({ userId, title: role === "admin" ? "Administrator" : "Clinician", employmentStatus: "active" })
      .onConflictDoNothing({ target: staffProfiles.userId });
  }
}

/** Display copy only — authorization always reads users.role. */
async function mirrorRoleToClerk(clerkUserId: string, role: AppRole) {
  const client = await clerkClient();
  await client.users.updateUserMetadata(clerkUserId, { publicMetadata: { role, invitedVia: null, clinicianVerified: null } });
}

function rowCount(result: unknown): number {
  const r = result as { rowCount?: number | null; rows?: unknown[] } | unknown[];
  if (Array.isArray(r)) return r.length;
  return r.rowCount ?? r.rows?.length ?? 0;
}

