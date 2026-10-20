type T = (key: string, values?: Record<string, string | number>) => string;

/** "Today", "3 days ago" or "Never", using backoffice.common.* messages. */
export function relDays(t: T, days: number | null): string {
  if (days === null) return t("common.never");
  return days === 0 ? t("common.today") : t("common.daysAgo", { n: days });
}

/** Short, non-identifying record id shown to operations staff: "P-3F9A1C". */
export function shortId(patientProfileId: string): string {
  return `P-${patientProfileId.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/** "2026-10" → "Oct" in the current locale. */
export function monthLabel(month: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(new Date(`${month}-01T00:00:00Z`));
}

/** Today plus `days` (negative for the past), for the demonstration rows' dates. */
export function fromToday(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}
