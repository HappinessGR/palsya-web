import type { Metadata } from "next";
import { pageMetadata } from "../../i18n/metadata";
import { redirectSignedInToDashboard } from "../../src/lib/authz";
import { TOKEN_TTL_MINUTES } from "../../src/lib/password-reset";
import { AuthShell } from "./AuthShell";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export async function generateMetadata(): Promise<Metadata> {
  return { ...(await pageMetadata("passwordReset.forgot.meta")), robots: { index: false, follow: false } };
}

/** Public page: request a reset link. Signed-in users go to their own dashboard. */
export default async function ForgotPasswordPage() {
  await redirectSignedInToDashboard();
  return (
    <AuthShell ttlMinutes={TOKEN_TTL_MINUTES}>
      <ForgotPasswordForm ttlMinutes={TOKEN_TTL_MINUTES} />
    </AuthShell>
  );
}
