"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { isLocale, LOCALE_STORAGE_KEY, localeNames, locales, type Locale } from "../../i18n/config";
import { setLocale } from "../../i18n/actions";
import { Flag } from "./Flag";
import { Icon } from "./Icon";

export function rememberLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage blocked (private mode): the cookie still carries the choice.
  }
  document.documentElement.lang = locale;
}

/** Flag + code + native name dropdown. Switching re-renders in place, no reload. */
export function LanguageSwitcher({ variant = "nav" }: { variant?: "nav" | "block" }) {
  const t = useTranslations("common.language");
  const current = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  const choose = (locale: Locale) => {
    setOpen(false);
    if (locale === current) return;
    rememberLocale(locale);
    startTransition(() => setLocale(locale));
  };

  const openList = () => {
    setActive(Math.max(0, locales.indexOf(current)));
    setOpen(true);
  };

  const onListKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") setActive((i) => (i + 1) % locales.length);
    else if (e.key === "ArrowUp") setActive((i) => (i - 1 + locales.length) % locales.length);
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(locales.length - 1);
    else if (e.key === "Enter" || e.key === " ") choose(locales[active]);
    else if (e.key === "Escape" || e.key === "Tab") setOpen(false);
    else return;
    e.preventDefault();
  };

  return (
    <div className={`lang-switcher lang-switcher-${variant}`} ref={rootRef}>
      <button
        type="button"
        className="lang-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={t("change", { language: localeNames[current] })}
        aria-busy={pending}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            openList();
          }
        }}
      >
        <Flag locale={current} size={14} />
        <span className="lang-code">{current.toUpperCase()}</span>
        {variant === "block" && <span className="lang-name">{localeNames[current]}</span>}
        <Icon name="chevron-down" size={14} />
      </button>

      {open && (
        <ul
          id={listId}
          ref={listRef}
          className="lang-menu"
          role="listbox"
          tabIndex={-1}
          aria-label={t("label")}
          aria-activedescendant={`${listId}-${locales[active]}`}
          onKeyDown={onListKey}
        >
          {locales.map((locale, i) => (
            <li
              key={locale}
              id={`${listId}-${locale}`}
              role="option"
              lang={locale}
              aria-selected={locale === current}
              className={i === active ? "lang-opt active" : "lang-opt"}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(locale)}
            >
              <Flag locale={locale} size={14} />
              <span className="lang-code">{locale.toUpperCase()}</span>
              <span className="lang-name">{localeNames[locale]}</span>
              {locale === current && <Icon name="check" size={14} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Keeps the cookie, localStorage and <html lang> in agreement. If the cookie
 * was cleared but localStorage still has a choice, restore it.
 */
export function LocaleSync() {
  const current = useLocale() as Locale;

  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    } catch {}
    if (isLocale(stored) && stored !== current) {
      document.documentElement.lang = stored;
      void setLocale(stored);
      return;
    }
    rememberLocale(current);
  }, [current]);

  return null;
}
