import type { Metadata } from "next";
import { pageMetadata } from "../../i18n/metadata";
import { checkResetToken, TOKEN_TTL_MINUTES } from "../../src/lib/password-reset";
import { AuthShell } from "../forgot-password/AuthShell";
import { LinkProblem } from "./LinkProblem";
import { ResetPasswordForm } from "./ResetPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  return {
    ...(await pageMetadata("passwordReset.reset.meta")),
    robots: { index: false, follow: false },
    // Keep the token out of the Referer header sent to anything the page loads.
    referrer: "no-referrer",
  };
}

/** Public page reached from the emailed link. The token is checked (not consumed) before showing the form. */
export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token: raw } = await searchParams;
  const token = typeof raw === "string" ? raw : undefined;
  const state = await checkResetToken(token);

  return (
    <AuthShell ttlMinutes={TOKEN_TTL_MINUTES}>
      {state === "valid" && token ? (
        <ResetPasswordForm token={token} ttlMinutes={TOKEN_TTL_MINUTES} />
      ) : (
        <LinkProblem kind={state === "valid" ? "invalid" : state} ttlMinutes={TOKEN_TTL_MINUTES} />
      )}
    </AuthShell>
  );
}
