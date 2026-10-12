import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { SiteHeader } from "../components/SiteHeader";
import { AuthSidePanel } from "../components/AuthSidePanel";

/** The /sign-in page frame (header, side panel, card), shared by /forgot-password and /reset-password. */
export function AuthShell({ ttlMinutes, children }: { ttlMinutes: number; children: ReactNode }) {
  const t = useTranslations("passwordReset.side");
  return (
    <>
      <SiteHeader />
      <div className="auth-wrap">
        <AuthSidePanel
          title={t("title")}
          points={[t("points.progress"), t("points.secure", { minutes: ttlMinutes })]}
        />
        <div className="auth-main">
          <div className="auth-card">{children}</div>
        </div>
      </div>
    </>
  );
}
