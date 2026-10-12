"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";

const ITEMS = [
  { key: "overview", href: "/admin" },
  { key: "users", href: "/admin/users" },
  { key: "invite", href: "/admin/invite" },
  { key: "audit", href: "/admin/audit" },
] as const;

/** Sub-navigation shown at the top of every admin page. */
export function AdminNav() {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const isOn = (href: string) => (href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav aria-label={t("label")} style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: "var(--s-6)" }}>
      {ITEMS.map((item) => {
        const on = isOn(item.href);
        return (
          <Link
            key={item.key}
            href={item.href}
            className={on ? "btn btn-sm" : "btn btn-sm btn-ghost"}
            aria-current={on ? "page" : undefined}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
