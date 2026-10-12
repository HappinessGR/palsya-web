import { pageMetadata } from "../../../i18n/metadata";
import { AuthContinueClient } from "./AuthContinueClient";

export async function generateMetadata() {
  return pageMetadata("auth.continue.meta");
}

export default function AuthContinuePage() {
  return <AuthContinueClient />;
}
