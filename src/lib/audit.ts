import "server-only";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { actionTypes, activityLog } from "../db/schema/activity";

/** Codes seeded into action_types by drizzle/20260929113718_roles_audit_password_reset. */
export type AuditAction =
  | "role_changed"
  | "user_invited"
  | "invitation_revoked"
  | "patient_assigned"
  | "user_deactivated"
  | "user_reactivated"
  | "patient_stage_changed"
  | "clinician_note_added"
  | "password_reset_requested"
  | "password_reset_completed"
  | "user_demoted_self_registered";

const actionTypeIds = new Map<string, number>();

async function actionTypeId(code: AuditAction): Promise<number> {
  const cached = actionTypeIds.get(code);
  if (cached) return cached;
  const [row] = await db.select({ id: actionTypes.id }).from(actionTypes).where(eq(actionTypes.code, code));
  if (!row) throw new Error(`Unknown audit action type "${code}" — is the migration applied?`);
  actionTypeIds.set(code, row.id);
  return row.id;
}

/**
 * Appends one row to activity_log: who (actorUserId, null for anonymous
 * requests such as a password-reset request), what (action + target), when
 * (created_at) and the details (before/after values etc.) in metadata.
 */
export async function logAction(
  actorUserId: string | null,
  action: AuditAction,
  target: { type: string; id?: string | null } | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await db.insert(activityLog).values({
    userId: actorUserId,
    actionTypeId: await actionTypeId(action),
    targetType: target?.type ?? null,
    targetId: target?.id ?? null,
    metadata,
  });
}
