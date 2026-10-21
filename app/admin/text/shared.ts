/**
 * Where "Preview drafts" opens for each message namespace: the page that shows
 * most of that namespace's text. Patient-only pages (/dashboard/...) open for
 * an admin only if they also hold a patient account, so those fall back to
 * the home page.
 */
const PREVIEW_PATHS: Record<string, string> = {
  landing: "/",
  howItWorks: "/how-it-works",
  guides: "/faq",
  stories: "/stories",
  pricing: "/pricing",
  about: "/about",
  auth: "/login",
  passwordReset: "/reset-password",
  admin: "/admin",
  backoffice: "/admin",
  clinician: "/clinician",
};

export function previewPath(ns: string): string {
  return PREVIEW_PATHS[ns] ?? "/";
}

/** The namespaces most people come to edit, listed first in the picker. */
export const PUBLIC_NAMESPACES = ["common", "landing", "howItWorks", "pricing", "about", "stories", "guides"] as const;
