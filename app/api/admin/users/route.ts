import { NextResponse } from "next/server";
import { authorizeApi } from "../../../../src/lib/authz";
import { toAppRole } from "../../../../src/lib/permissions";
import { listUsers } from "../../../../src/lib/user-admin";

/** GET /api/admin/users — every non-deleted account with its clinician assignment. */
export async function GET() {
  const authz = await authorizeApi("users:read");
  if (!authz.ok) return authz.response;

  const rows = await listUsers();
  return NextResponse.json({
    users: rows.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      role: toAppRole(u.role) ?? "patient",
      status: u.status,
      createdAt: u.createdAt,
      patientProfileId: u.patientProfile?.id ?? null,
      assignedClinicianId: u.patientProfile?.assignedClinicianId ?? null,
    })),
  });
}
