"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

function AuthTabsLoading() {
  const t = useTranslations("auth");
  return <p className="muted">{t("loading")}</p>;
}

// Clerk Elements' virtual routing reads a browser-only store with no server
// snapshot, so server-rendering it throws. Render the tabs in the browser only.
export const AuthTabsClient = dynamic(() => import("./AuthTabs").then((m) => m.AuthTabs), {
  ssr: false,
  loading: () => <AuthTabsLoading />,
});
