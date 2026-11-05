import "server-only";

/**
 * Palsya's public contact details: the single source for the footer, the
 * /contact page and emails. Change them here and nowhere else.
 * These are data, not UI copy, so they are not translated. The country
 * name is localised at render time from `countryCode`.
 */
export const contact = {
  street: "Valkenburgerstraat 188E", // i18n-ignore -- postal address
  postalCodeCity: "1011 NC Amsterdam", // i18n-ignore -- postal address
  countryCode: "NL",
  /** Shown as written in the Netherlands. */
  phoneDisplay: "020 463 8243", // i18n-ignore -- phone number
  /** International (E.164) form so the link works when dialled from abroad. */
  phoneHref: "tel:+31204638243",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent("Valkenburgerstraat 188E, 1011 NC Amsterdam, Netherlands"),
} as const;

export function supportEmail(): string {
  return process.env.SUPPORT_EMAIL ?? "support@palsya.health";
}

/** The country name in the visitor's language, e.g. "Nederland" or "Netherlands". */
export function countryName(locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(contact.countryCode) ?? contact.countryCode;
  } catch {
    return contact.countryCode;
  }
}
