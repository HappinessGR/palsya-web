"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { SignOutButton } from "@clerk/nextjs";
import { BrandMark } from "../../components/BrandMark";
import { Icon } from "../../components/Icon";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { NAV_GROUPS, SETTINGS_ITEM, isActive, titleKeyFor } from "../nav";
import type { ShellData } from "../shell-data";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/**
 * The patient app frame — sidebar + top bar — ported from the legacy
 * prototype's sidebar()/topbar() in assets/js/app.js. Every /dashboard page
 * renders inside it via app/dashboard/layout.tsx. Below 1000px the sidebar
 * becomes a drawer opened from the top bar's menu button (same as legacy).
 */
export function AppShell({
  data,
  stageName,
  children,
}: {
  data: ShellData;
  stageName: string;
  children: ReactNode;
}) {
  const t = useTranslations("dashboard.shell");
  const pathname = usePathname();
  // The drawer remembers which page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (v: boolean) => setOpenOn(v ? pathname : null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenOn(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const s = data.stageNum;
  const title = t(`nav.${titleKeyFor(pathname)}`);

  return (
    <div className="shell">
      <aside className={open ? "side open" : "side"} id="side" aria-label={t("sidebarLabel")}>
        <Link className="side-brand" href="/">
          <BrandMark size={28} />
          <span className="brand-name">Palsya</span>
        </Link>

        <div className="card card-pad-sm card-flat" style={{ background: `var(--p${s}-tint)`, borderColor: "transparent" }}>
          <div
            className="small"
            style={{ color: `var(--p${s}-ink)`, fontWeight: 700, fontSize: 10.5, letterSpacing: ".08em", textTransform: "uppercase" }}
          >
            {t("stageLabel", { n: s })}
          </div>
          <div className="strong" style={{ fontSize: "var(--t-base)", marginTop: 2 }}>
            {stageName}
          </div>
          <div className="small muted" style={{ marginTop: 2 }}>
            {t("dayLabel", { n: data.programDay })}
          </div>
        </div>

        <nav className="side-nav" aria-label={t("navLabel")}>
          {NAV_GROUPS.map((g) => (
            <div className="side-group" key={g.key}>
              <h6>{t(`groups.${g.key}`)}</h6>
              {g.items.map((item) => {
                const on = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    className={on ? "side-link on" : "side-link"}
                    href={item.href}
                    aria-current={on ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    <Icon name={item.icon} size={18} />
                    <span className="grow">{t(`nav.${item.key}`)}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="side-foot">
          <Link
            className={isActive(pathname, SETTINGS_ITEM.href) ? "side-link on" : "side-link"}
            href={SETTINGS_ITEM.href}
            aria-current={isActive(pathname, SETTINGS_ITEM.href) ? "page" : undefined}
          >
            <Icon name={SETTINGS_ITEM.icon} size={18} />
            <span>{t(`nav.${SETTINGS_ITEM.key}`)}</span>
          </Link>
          <Link className="side-user" href={SETTINGS_ITEM.href}>
            <div className="avatar avatar-soft" aria-hidden="true">
              {initials(data.name)}
            </div>
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="side-user-n" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {data.name || t("account")}
              </div>
              <div className="side-user-s">{data.plan === "trial" ? t("freeTrial") : t("subscriber")}</div>
            </div>
          </Link>
          <SignOutButton redirectUrl="/">
            <button type="button" className="side-link">
              <Icon name="log-out" size={18} />
              <span>{t("signOut")}</span>
            </button>
          </SignOutButton>
        </div>
      </aside>

      <div className="main">
        <div className="topbar">
          <button
            type="button"
            className="side-toggle"
            aria-label={t("menu")}
            aria-controls="side"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <Icon name="menu" size={19} />
          </button>
          <h1>{title}</h1>
          <div className="topbar-r">
            <LanguageSwitcher />
            <Link className="btn btn-sm btn-quiet" href="/guides">
              <Icon name="help-circle" size={16} />
              <span className="hide-sm">{t("help")}</span>
            </Link>
            <Link className="btn btn-sm" href="/dashboard/scan">
              <Icon name="camera" size={16} />
              <span className="hide-sm">{t("scan")}</span>
            </Link>
          </div>
        </div>
        <main id="main">{children}</main>
      </div>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}
    </div>
  );
}
