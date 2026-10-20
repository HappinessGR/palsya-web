/**
 * Patient-app navigation, ported from the legacy prototype's SIDE() in
 * assets/js/app.js. One list drives the sidebar links, the active-link
 * highlight and the top-bar page title, so they can't drift apart.
 * Labels live in locales/<locale>/dashboard.json under shell.nav.*.
 */
export type NavItem = { href: string; icon: string; key: string };
export type NavGroup = { key: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
  {
    key: "programme",
    items: [
      { href: "/dashboard", icon: "home", key: "today" },
      { href: "/dashboard/taping", icon: "tape", key: "taping" },
      { href: "/dashboard/exercises", icon: "activity", key: "exercises" },
      { href: "/dashboard/routine", icon: "sun", key: "routine" },
    ],
  },
  {
    key: "progress",
    items: [
      { href: "/dashboard/scan", icon: "camera", key: "scan" },
      { href: "/dashboard/progress", icon: "trending-up", key: "phaseProgress" },
      { href: "/dashboard/timeline", icon: "image", key: "timeline" },
      { href: "/dashboard/report", icon: "file", key: "report" },
      { href: "/dashboard/milestones", icon: "flag", key: "milestones" },
    ],
  },
  {
    key: "historySupport",
    items: [
      { href: "/dashboard/log", icon: "calendar", key: "log" },
      { href: "/dashboard/consults", icon: "video", key: "consults" },
      { href: "/dashboard/library", icon: "book-open", key: "library" },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = { href: "/dashboard/settings", icon: "settings", key: "settings" };

/** Pages reachable from inside the app but not listed in the sidebar. */
const EXTRA_TITLES: Record<string, string> = {
  "/dashboard/session": "session",
};

/** Message key under shell.nav.* for the page title shown in the top bar. */
export function titleKeyFor(pathname: string): string {
  const path = pathname.replace(/\/$/, "") || "/dashboard";
  for (const g of NAV_GROUPS) for (const item of g.items) if (item.href === path) return item.key;
  if (path === SETTINGS_ITEM.href) return SETTINGS_ITEM.key;
  for (const [prefix, key] of Object.entries(EXTRA_TITLES)) if (path.startsWith(prefix)) return key;
  // Nested pages (e.g. /dashboard/exercises/brow) take their section's title.
  for (const g of NAV_GROUPS) for (const item of g.items) if (item.href !== "/dashboard" && path.startsWith(`${item.href}/`)) return item.key;
  return "today";
}

/** Exact match for Today; prefix match for every other section. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard" || pathname === "/dashboard/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
