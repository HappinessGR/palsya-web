import { redirectSignedInToDashboard } from "../../../src/lib/authz";
import { pageMetadata } from "../../../i18n/metadata";
import { SignUpPageClient } from "./SignUpPageClient";

export async function generateMetadata() {
  return pageMetadata("auth.signUp.meta");
}

export default async function SignUpPage() {
  // Already signed in: go straight to this account's dashboard.
  await redirectSignedInToDashboard();
  return <SignUpPageClient />;
}
