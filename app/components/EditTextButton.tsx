"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";

/** Public page → the message namespace holding most of its text (inverse of app/admin/text/shared.ts previewPath). */
const NAMESPACE_BY_PATH: Record<string, string> = {
  "/": "home",
  "/how-it-works": "howItWorks",
  "/pricing": "pricing",
  "/about": "about",
  "/team": "about",
  "/stories": "stories",
  "/faq": "guides",
  "/login": "auth",
};

/**
 * Floating "Edit this page's text" button, rendered by the root layout only
 * for admins (content:write). Opens /admin/text on this page's text. Hidden
 * inside the back office and clinician portal, which have their own tabs.
 */
export function EditTextButton({ label }: { label: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin") || pathname.startsWith("/clinician")) return null;
  const ns = NAMESPACE_BY_PATH[pathname.replace(/\/$/, "") || "/"] ?? "common";

  return (
    <Link
      href={`/admin/text?ns=${ns}`}
      className="btn btn-sm"
      style={{ position: "fixed", right: 20, bottom: 20, zIndex: 120, boxShadow: "0 6px 20px rgba(20,38,35,.18)" }}
    >
      <Icon name="file" size={15} />
      {label}
    </Link>
  );
}
