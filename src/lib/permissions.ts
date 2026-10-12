/**
 * The single definition of what each role may do. Pages, server actions and
 * API routes ask `can(role, permission)` (via src/lib/authz.ts) instead of
 * comparing role strings themselves, so changing what a role can do means
 * editing this file only.
 *
 * The role itself comes from users.role in the database — written only by
 * server code (public sign-up → patient, accepted invitation → the invited
 * role, an admin's role change, scripts/create_admin.mjs). Nothing the browser
 * sends (form fields, query strings, storage) is ever read as a role.
 */
export type AppRole = "patient" | "clinician" | "admin";

export const APP_ROLES: readonly AppRole[] = ["patient", "clinician", "admin"];

export type Permission =
  // Patient: only their own record.
  | "self:programme" // own dashboard, sessions, progress, onboarding
  | "self:billing" // own trial / subscription / payment method
  // Clinician: only patients assigned to them (checked per record by assertCanAccessPatient).
  | "patients:assigned:read"
  | "patients:assigned:notes"
  | "patients:assigned:stage"
  // Admin.
  | "patients:all:read"
  | "users:read"
  | "users:invite"
  | "users:role"
  | "users:status"
  | "assignments:write"
  | "audit:read"
  | "settings:write";

export const ROLE_PERMISSIONS: Record<AppRole, readonly Permission[]> = {
  patient: ["self:programme", "self:billing"],
  clinician: ["patients:assigned:read", "patients:assigned:notes", "patients:assigned:stage"],
  admin: [
    "patients:all:read",
    "users:read",
    "users:invite",
    "users:role",
    "users:status",
    "assignments:write",
    "audit:read",
    "settings:write",
  ],
};

/** Where each role lands after signing in, and where a wrong-area visit is sent. */
export const ROLE_HOME: Record<AppRole, string> = {
  patient: "/patient",
  clinician: "/clinician",
  admin: "/admin",
};

/** Roles an admin may hand out through an invitation. Patients sign up themselves. */
export const INVITABLE_ROLES: readonly AppRole[] = ["clinician", "admin"];

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/** Maps the DB enum (which also has the legacy "superuser") onto app roles. */
export function toAppRole(dbRole: string | null | undefined): AppRole | null {
  if (dbRole === "superuser") return "admin";
  return isAppRole(dbRole) ? dbRole : null;
}

export function can(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
