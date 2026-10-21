/**
 * Where "Preview drafts" opens for each message namespace: the page that shows
 * most of that namespace's text. Patient-only pages (/dashboard/...) open for
 * an admin only if they also hold a patient account, so those fall back to
 * the home page.
 */
const PREVIEW_PATHS: Record<string, string> = {
  home: "/",
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

/**
 * Pages whose text comes from several namespaces, edited together. The home
 * page (app/page.tsx) reads landing, the stories' testimonials and the stage
 * names, plus the shared header and footer (common).
 */
export const PAGE_GROUPS: Record<string, readonly string[]> = {
  home: ["landing", "stories.testimonials", "programme.stages", "common"],
};

/** The key prefixes a picker value covers: a page group, a single namespace, or null when unknown. */
export function prefixesFor(value: string, namespaces: readonly string[]): readonly string[] | null {
  if (PAGE_GROUPS[value]) return PAGE_GROUPS[value];
  return namespaces.includes(value) ? [value] : null;
}

/** True when `key` sits under one of `prefixes` ("landing.hero.title" is under "landing"). */
export const underAny = (key: string, prefixes: readonly string[]) => prefixes.some((p) => key.startsWith(`${p}.`));
