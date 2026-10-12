import type { Locale } from "../../i18n/config";

/**
 * Inline SVG flags. Emoji flags are not drawn on Windows (🇬🇧 renders as
 * the letters "GB"), so the switcher uses these instead.
 */
const FLAGS: Record<Locale, React.ReactNode> = {
  en: (
    <>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#fff" strokeWidth="8" />
      <path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" strokeWidth="3" />
      <path d="M30 0v40M0 20h60" stroke="#fff" strokeWidth="12" />
      <path d="M30 0v40M0 20h60" stroke="#C8102E" strokeWidth="7" />
    </>
  ),
  pt: (
    <>
      <rect width="60" height="40" fill="#DA291C" />
      <rect width="24" height="40" fill="#046A38" />
      <circle cx="24" cy="20" r="7" fill="#FFE900" />
    </>
  ),
  nl: (
    <>
      <rect width="60" height="40" fill="#fff" />
      <rect width="60" height="13.33" fill="#AE1C28" />
      <rect y="26.67" width="60" height="13.33" fill="#21468B" />
    </>
  ),
  es: (
    <>
      <rect width="60" height="40" fill="#AA151B" />
      <rect y="10" width="60" height="20" fill="#F1BF00" />
    </>
  ),
  fr: (
    <>
      <rect width="60" height="40" fill="#fff" />
      <rect width="20" height="40" fill="#002395" />
      <rect x="40" width="20" height="40" fill="#ED2939" />
    </>
  ),
  de: (
    <>
      <rect width="60" height="40" fill="#000" />
      <rect y="13.33" width="60" height="13.34" fill="#DD0000" />
      <rect y="26.67" width="60" height="13.33" fill="#FFCE00" />
    </>
  ),
  af: (
    <>
      <rect width="60" height="20" fill="#E03C31" />
      <rect y="20" width="60" height="20" fill="#001489" />
      <path d="M0 0l30 20h30M0 40l30-20" stroke="#fff" strokeWidth="13" fill="none" />
      <path d="M0 0l30 20h30M0 40l30-20" stroke="#007749" strokeWidth="8" fill="none" />
      <path d="M0 6l21 14L0 34z" fill="#FFB81C" />
      <path d="M0 9.5l16 10.5L0 30.5z" fill="#000" />
    </>
  ),
};

export function Flag({ locale, size = 18 }: { locale: Locale; size?: number }) {
  return (
    <svg
      className="lang-flag"
      width={size * 1.5}
      height={size}
      viewBox="0 0 60 40"
      aria-hidden="true"
      focusable="false"
      style={{ borderRadius: 2, flex: "none" }}
    >
      {FLAGS[locale]}
    </svg>
  );
}
