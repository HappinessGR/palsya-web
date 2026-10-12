"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { isLocale } from "../../../i18n/config";
import { authorizeAction } from "../../../src/lib/authz";
import { appUrl } from "../../../src/lib/password-reset";
import { inviteUser, revokeInvitation } from "../../../src/lib/user-admin";
import { isInvitationId } from "../shared";

function back(outcome: { result: string } | { error: string }): never {
  const qs = new URLSearchParams("result" in outcome ? { result: outcome.result } : { error: outcome.error });
  redirect(`/admin/invite?${qs.toString()}`);
}

/** Invites a clinician or admin. Role and email are re-validated in inviteUser. */
export async function inviteAction(form: FormData): Promise<void> {
  const auth = await authorizeAction("users:invite");
  if (!auth.ok) back({ error: auth.error });

  const locale = form.get("locale");
  if (!isLocale(locale)) back({ error: "invalid_locale" });

  const res = await inviteUser(
    auth.actor,
    { email: form.get("email"), role: form.get("role"), locale },
    appUrl(),
    await getLocale(),
  );
  revalidatePath("/admin", "layout");
  back(res.ok ? { result: "invited" } : { error: res.error });
}

export async function revokeAction(form: FormData): Promise<void> {
  const auth = await authorizeAction("users:invite");
  if (!auth.ok) back({ error: auth.error });

  const id = form.get("invitationId");
  if (!isInvitationId(id)) back({ error: "invalid_input" });

  const res = await revokeInvitation(auth.actor, id);
  revalidatePath("/admin", "layout");
  back(res.ok ? { result: "revoked" } : { error: res.error });
}
