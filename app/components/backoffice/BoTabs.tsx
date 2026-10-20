"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type BoTab = { href: string; label: string };

/**
 * The back-office tab strip (legacy .bo-tabs). The first tab is the area's
 * root and matches exactly; every other tab also stays on for its sub-pages
 * (e.g. /clinician/patients/<id> keeps "Patients" selected).
 */
export function BoTabs({ tabs, label }: { tabs: BoTab[]; label: string }) {
  const pathname = usePathname();
  const root = tabs[0]?.href;
  const isOn = (href: string) => (href === root ? pathname === href : pathname === href || pathname.startsWith(`${href}/`));

  return (
    <nav className="bo-tabs" aria-label={label}>
      {tabs.map((tab) => (
        <Link key={tab.href} className="bo-tab" href={tab.href} aria-current={isOn(tab.href) ? "page" : undefined}>
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
