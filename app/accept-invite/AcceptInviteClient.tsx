"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

function Loading() {
  const t = useTranslations("invite");
  return <p className="muted">{t("loading")}</p>;
}

// Clerk Elements reads a browser-only store, so the form renders client-side only.
export const AcceptInviteClient = dynamic(() => import("./AcceptInviteForm").then((m) => m.AcceptInviteForm), {
  ssr: false,
  loading: () => <Loading />,
});
