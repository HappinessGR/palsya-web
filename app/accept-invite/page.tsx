import { redirectSignedInToDashboard } from "../../src/lib/authz";
import { pageMetadata } from "../../i18n/metadata";
import { AcceptInviteClient } from "./AcceptInviteClient";

export async function generateMetadata() {
  return { ...(await pageMetadata("invite.meta")), robots: { index: false } };
}

/**
 * Landing page of the link in a clinician/admin invitation email
 * (src/lib/user-admin.ts inviteUser). Clerk's invitation ticket in the URL
 * (__clerk_ticket) carries the email and the role an admin chose; the invitee
 * only sets their name and password here. After sign-up Clerk sends them to
 * /auth/continue, where the server provisions the account with the invited role.
 */
export default async function AcceptInvitePage() {
  await redirectSignedInToDashboard();
  return <AcceptInviteClient />;
}
