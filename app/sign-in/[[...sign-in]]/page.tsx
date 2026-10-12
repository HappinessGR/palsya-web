import { redirectSignedInToDashboard } from "../../../src/lib/authz";
import { pageMetadata } from "../../../i18n/metadata";
import { SignInPageClient } from "./SignInPageClient";

export async function generateMetadata() {
  return pageMetadata("auth.signIn.meta");
}

export default async function SignInPage() {
  // Already signed in: go straight to this account's dashboard.
  await redirectSignedInToDashboard();
  return <SignInPageClient />;
}
