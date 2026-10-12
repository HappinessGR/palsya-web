import { getTranslations } from "next-intl/server";
import { SiteHeader } from "../components/SiteHeader";
import { AuthSidePanel } from "../components/AuthSidePanel";
import { redirectSignedInToDashboard } from "../../src/lib/authz";
import { pageMetadata } from "../../i18n/metadata";
import { AuthTabsClient } from "./AuthTabsClient";

export async function generateMetadata() {
  return pageMetadata("auth.login.meta");
}

// Error codes sent back here (?error=<code>) by app/auth/continue and the guards.
const ERROR_KEYS = {
  account_suspended: "accountSuspended",
  not_signed_in: "notSignedIn",
  generic: "generic",
} as const;

function isErrorCode(code: string): code is keyof typeof ERROR_KEYS {
  return Object.hasOwn(ERROR_KEYS, code);
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  // Already signed in: skip the form and go straight to this account's dashboard.
  await redirectSignedInToDashboard();

  const t = await getTranslations("auth");
  const { mode, error } = await searchParams;

  let errorMessage: string | undefined;
  if (typeof error === "string" && error) {
    errorMessage = t(`continue.errors.${isErrorCode(error) ? ERROR_KEYS[error] : "generic"}`);
  }

  return (
    <>
      <SiteHeader />
      <div className="auth-wrap">
        <AuthSidePanel
          title={t("login.side.title")}
          points={[
            t("login.side.points.patients"),
            t("login.side.points.clinicians"),
            t("login.side.points.missedDays"),
          ]}
        />
        <div className="auth-main">
          <div className="auth-card">
            <AuthTabsClient initialMode={mode === "signup" ? "signup" : "signin"} error={errorMessage} />
          </div>
        </div>
      </div>
    </>
  );
}
