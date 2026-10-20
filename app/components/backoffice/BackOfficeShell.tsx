import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "../BrandMark";
import { Icon } from "../Icon";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { BoTabs, type BoTab } from "./BoTabs";
import "../../../styles/appSupport.css";
import "../../../styles/backoffice.css";

/**
 * Page frame shared by the admin back office and the clinician portal,
 * ported from the legacy prototype's V.admin.render (assets/js/views-admin.js):
 * brand mark + heading, intro line, "Back to the site", then the tab strip.
 * Like the prototype it renders bare — no public site header.
 */
export function BackOfficeShell({
  heading,
  intro,
  backLabel,
  tabs,
  tabsLabel,
  children,
}: {
  heading: string;
  intro: string;
  backLabel: string;
  tabs: BoTab[];
  tabsLabel: string;
  children: ReactNode;
}) {
  return (
    <div className="page bo-page">
      <div className="row-between" style={{ flexWrap: "wrap", gap: 14, marginBottom: "var(--s-5)" }}>
        <div>
          <div className="row" style={{ gap: 10 }}>
            <BrandMark size={30} />
            <h2 className="display" style={{ fontSize: "var(--t-2xl)" }}>
              {heading}
            </h2>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            {intro}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <LanguageSwitcher />
          <Link className="btn btn-sm btn-ghost" href="/">
            <Icon name="arrow-left" size={15} />
            {backLabel}
          </Link>
        </div>
      </div>
      <BoTabs tabs={tabs} label={tabsLabel} />
      {children}
    </div>
  );
}
