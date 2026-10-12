"use server";

import { completePasswordReset, type ResetError } from "../../src/lib/password-reset";

export type ResetState = { status: "idle" } | { status: "done" } | { status: "error"; error: ResetError };

/**
 * Public (signed-out) action: the one-time token is the credential. It is
 * only ever read from the form field here and never logged; the password is
 * re-checked against the policy on the server by completePasswordReset.
 */
export async function resetPasswordAction(_prev: ResetState, formData: FormData): Promise<ResetState> {
  const token = formData.get("token");
  const password = formData.get("password");
  const confirm = formData.get("confirm");

  if (typeof token !== "string" || token.length === 0 || token.length > 200) {
    return { status: "error", error: "invalid" };
  }
  if (typeof password !== "string" || typeof confirm !== "string") {
    return { status: "error", error: "weak" };
  }

  try {
    const result = await completePasswordReset(token, password, confirm);
    return result.ok ? { status: "done" } : { status: "error", error: result.error };
  } catch {
    console.error("[password-reset] completion failed");
    return { status: "error", error: "failed" };
  }
}
