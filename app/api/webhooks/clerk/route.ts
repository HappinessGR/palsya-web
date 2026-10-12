import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { UserJSON, DeletedObjectJSON } from "@clerk/nextjs/server";
import { db } from "../../../../src/db";
import { users, patientProfiles, staffProfiles } from "../../../../src/db/schema/users";
import { invitedRole } from "../../../../src/lib/authz";

// Closes the gap noted in app/dashboard/data.ts: without this webhook no
// `users` row is ever created, so getPatientStage() always falls back to
// stage 1 regardless of what's in patientProfiles. The role is decided by the
// server only: an admin's invitation (see src/lib/user-admin.ts inviteUser),
// otherwise "patient". After creation users.role is the source of truth and
// this webhook never changes it (role changes go through the admin area).

function nameFrom(evt: UserJSON): string {
  const parts = [evt.first_name, evt.last_name].filter(Boolean) as string[];
  if (parts.length) return parts.join(" ");
  const primaryEmail = evt.email_addresses.find((e) => e.id === evt.primary_email_address_id);
  return primaryEmail?.email_address.split("@")[0] ?? "Patient";
}

function primaryEmailVerifiedAt(evt: UserJSON): Date | null {
  const primaryEmail = evt.email_addresses.find((e) => e.id === evt.primary_email_address_id);
  return primaryEmail?.verification?.status === "verified" ? new Date() : null;
}

export async function POST(req: NextRequest) {
  let evt;
  try {
    evt = await verifyWebhook(req);
  } catch (err) {
    console.error("Clerk webhook signature verification failed", err);
    return new NextResponse("Webhook signature verification failed", { status: 400 });
  }

  try {
    switch (evt.type) {
      case "user.created": {
        const data = evt.data as UserJSON;
        const primaryEmail = data.email_addresses.find((e) => e.id === data.primary_email_address_id);
        const role = invitedRole(data.public_metadata) ?? "patient";

        const [user] = await db
          .insert(users)
          .values({
            clerkUserId: data.id,
            email: primaryEmail?.email_address ?? `${data.id}@unknown.palsya.invalid`,
            fullName: nameFrom(data),
            role,
            status: "active",
            mfaEnabled: data.two_factor_enabled ?? false,
            emailVerifiedAt: primaryEmailVerifiedAt(data),
          })
          .onConflictDoNothing({ target: users.clerkUserId })
          .returning({ id: users.id });

        // onConflictDoNothing returns [] on a duplicate delivery (Svix
        // retries); look the row up so the patientProfiles insert below
        // still gets a real userId rather than silently skipping.
        const userId = user?.id ?? (await db.query.users.findFirst({ where: { clerkUserId: data.id } }))?.id;

        if (userId && role === "patient") {
          await db
            .insert(patientProfiles)
            .values({ userId, preferredLanguage: "en" })
            .onConflictDoNothing({ target: patientProfiles.userId });
        } else if (userId) {
          await db
            .insert(staffProfiles)
            .values({ userId, title: role === "admin" ? "Administrator" : "Clinician", employmentStatus: "active" })
            .onConflictDoNothing({ target: staffProfiles.userId });
        }
        break;
      }

      case "user.updated": {
        const data = evt.data as UserJSON;
        const primaryEmail = data.email_addresses.find((e) => e.id === data.primary_email_address_id);

        await db
          .update(users)
          .set({
            email: primaryEmail?.email_address,
            fullName: nameFrom(data),
            mfaEnabled: data.two_factor_enabled ?? false,
            emailVerifiedAt: primaryEmailVerifiedAt(data),
            updatedAt: new Date(),
          })
          .where(eq(users.clerkUserId, data.id));
        break;
      }

      case "user.deleted": {
        const data = evt.data as DeletedObjectJSON;
        if (data.id) {
          // GDPR soft-delete (see users.ts schema comment) — sign_in_events
          // and activity_log rows keep their audit value.
          await db
            .update(users)
            .set({ deletedAt: new Date(), status: "suspended", updatedAt: new Date() })
            .where(eq(users.clerkUserId, data.id));
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`Error handling Clerk event ${evt.type}`, err);
    // 500 so Clerk/Svix retries — don't mask a failed sync with a 200.
    return new NextResponse("Webhook handler error", { status: 500 });
  }
}
