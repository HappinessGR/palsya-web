"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { SignOutButton, useUser } from "@clerk/nextjs";
import { BrandMark } from "./BrandMark";
import { Icon } from "./Icon";
import { LanguageSwitcher } from "./LanguageSwitcher";

// Ported from the legacy prototype's assets/js/app.js publicNav()/mobileMenu().
// Signed out: a single "Log in" opens /login (Sign in / Sign up tabs).
// Signed in: the user's name, "My dashboard" (/me sends each role to its own
// dashboard) and "Log out". On phones these move into the burger menu.
const NAV_LINKS = [
  { key: "howItWorks", href: "/how-it-works" },
  { key: "stories", href: "/stories" },
  { key: "pricing", href: "/pricing" },
  { key: "about", href: "/about" },
] as const;

export function SiteHeader() {
  const t = useTranslations("common");
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [stuck, setStuck] = useState(false);
  const { isLoaded, isSignedIn, user } = useUser();
  const signedIn = isLoaded && isSignedIn;
  const displayName = user
    ? user.firstName || user.fullName || user.primaryEmailAddress?.emailAddress || ""
    : "";

  // Legacy adds .stuck (a shadow) once the page scrolls under the nav.
  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isOn = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <header className={stuck ? "nav stuck" : "nav"}>
        <div className="wrap nav-in">
          <Link className="brand" href="/" aria-label={t("nav.home")}>
            <BrandMark size={32} />
            <span className="brand-name">{t("brand")}</span>
          </Link>

          <nav className="nav-links" aria-label={t("nav.main")}>
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={isOn(link.href) ? "on" : undefined}>
                {t(`nav.${link.key}`)}
              </Link>
            ))}
          </nav>

          <button
            type="button"
            className="nav-burger"
            aria-label={menuOpen ? t("nav.closeMenu") : t("nav.menu")}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name="menu" size={20} />
          </button>

          <div className="nav-actions">
            <LanguageSwitcher />
            {signedIn ? (
              <>
                {displayName && (
                  <span className="nav-user" title={displayName}>
                    {displayName}
                  </span>
                )}
                <Link className="btn btn-sm nav-account" href="/me">
                  {t("nav.myDashboard")}
                </Link>
                <SignOutButton redirectUrl="/">
                  <button type="button" className="btn btn-sm btn-ghost nav-account">
                    {t("nav.logOut")}
                  </button>
                </SignOutButton>
              </>
            ) : (
              // Hidden until Clerk loads, so a signed-in user never sees "Log in" flash.
              <Link className="btn btn-sm nav-login" href="/login" style={isLoaded ? undefined : { visibility: "hidden" }}>
                {t("nav.logIn")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu" onClick={() => setMenuOpen(false)}>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={isOn(link.href) ? "on" : undefined}>
              {t(`nav.${link.key}`)}
            </Link>
          ))}
          {signedIn ? (
            <>
              <Link href="/me">{t("nav.myDashboard")}</Link>
              <SignOutButton redirectUrl="/">
                <button type="button" className="mobile-menu-btn">
                  {t("nav.logOut")}
                </button>
              </SignOutButton>
              {displayName && <p className="mobile-menu-user">{t("nav.signedInAs", { name: displayName })}</p>}
            </>
          ) : (
            <>
              <Link href="/login">{t("nav.logIn")}</Link>
              <div style={{ marginTop: 24 }}>
                <Link className="btn btn-lg btn-block" href="/sign-up">
                  {t("nav.startTrial")}
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
