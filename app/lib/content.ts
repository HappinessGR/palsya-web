/**
 * Marketing-page content ported from the legacy prototype's
 * assets/js/content.js (window.P.content). Only structure lives here — ids,
 * numbers, dates and the order of list items. All user-facing text is in
 * locales/<locale>/{guides,pricing,stories,common}.json, keyed by these ids:
 *
 *   guides.articles.<slug>.{title,blurb}      guides.faq.<group>.items.<q>.{q,a}
 *   pricing.plans.<id>.{name,forWho,features.<feature>}
 *   stories.items.<id>.*   stories.testimonials.<id>.*   stories.endorsements.<id>.*
 *   stories.press.<id>.{headline,kind}        common.medicalDisclaimer
 */
import { localeRegions, type Locale } from "../../i18n/config";

export type Article = {
  slug: string;
  read: number;
  updated: string;
  /** A person's name, or null for "Palsya clinical team" (guides.authorTeam). */
  author: string | null;
  reviewer: string;
  faq?: boolean;
};

export const articles: Article[] = [
  { slug: "what-is-pfp", read: 8, updated: "2026-06-14", author: "Dr. Hana Reis", reviewer: "Dr. Anders Vogt" },
  { slug: "stages-of-recovery", read: 7, updated: "2026-07-02", author: "Dr. Hana Reis", reviewer: "Dr. Anders Vogt" },
  { slug: "facial-taping-guide", read: 9, updated: "2026-07-19", author: "Ilse Brandt, PT", reviewer: "Dr. Hana Reis" },
  { slug: "facial-exercises-guide", read: 10, updated: "2026-07-25", author: "Ilse Brandt, PT", reviewer: "Dr. Anders Vogt" },
  { slug: "daily-routine", read: 7, updated: "2026-06-30", author: "Ilse Brandt, PT", reviewer: "Dr. Hana Reis" },
  { slug: "research-evidence", read: 9, updated: "2026-08-05", author: "Dr. Anders Vogt", reviewer: "Dr. Hana Reis" },
  { slug: "faq", read: 6, updated: "2026-08-12", author: null, reviewer: "Dr. Hana Reis", faq: true },
];

/** FAQ group ids → question ids, in display order (text in guides.faq). */
export const faqGroups: { id: string; questions: string[] }[] = [
  { id: "gettingStarted", questions: ["rightForMe", "diagnosis", "install", "technology"] },
  { id: "programme", questions: ["timePerDay", "missDays", "physio", "recovery"] },
  { id: "scans", questions: ["howScan", "photos", "scoreMeaning", "scoreDown"] },
  { id: "cost", questions: ["pricing", "whyThreeMonths", "cancel", "clinicians"] },
  { id: "privacy", questions: ["dataStored", "sellData", "exportDelete"] },
];

export type Plan = {
  id: "app" | "guided" | "supported";
  price: number;
  months: number;
  consults: number;
  perDay: number;
  best?: boolean;
  /** Feature ids, in display order (text in pricing.plans.<id>.features, may contain <b>). */
  features: string[];
  stripePriceId: string;
};

export const plans: Plan[] = [
  {
    id: "app",
    price: 89,
    months: 3,
    consults: 0,
    perDay: 0.99,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_APP ?? "",
    features: ["programme", "sessions", "scans", "timeline", "knowledge", "support"],
  },
  {
    id: "guided",
    price: 129,
    months: 3,
    consults: 2,
    perDay: 1.43,
    best: true,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_GUIDED ?? "",
    features: ["everything", "consults", "notes", "adjusted", "priority"],
  },
  {
    id: "supported",
    price: 179,
    months: 3,
    consults: 6,
    perDay: 1.99,
    stripePriceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SUPPORTED ?? "",
    features: ["everything", "consults", "continuity", "messages", "scanReviews"],
  },
];

export type Story = { id: string; name: string; startedWeek: number; months: number };

export const stories: Story[] = [
  { id: "marta", name: "Marta", startedWeek: 2, months: 5 },
  { id: "tomas", name: "Tomás", startedWeek: 6, months: 7 },
  { id: "sanne", name: "Sanne", startedWeek: 3, months: 9 },
];

export type Testimonial = { id: string; who: string; stars: number };

export const testimonials: Testimonial[] = [
  { id: "marek", who: "Marek T.", stars: 5 },
  { id: "aisling", who: "Aisling M.", stars: 5 },
  { id: "dieter", who: "Dieter H.", stars: 5 },
  { id: "rosa", who: "Rosa C.", stars: 4 },
  { id: "youssef", who: "Youssef B.", stars: 5 },
  { id: "lena", who: "Lena S.", stars: 5 },
];

export type Endorsement = { id: string; name: string };

export const endorsements: Endorsement[] = [
  { id: "rahn", name: "Dr. Elisabeth Rahn" },
  { id: "aubert", name: "Prof. Michel Aubert" },
  { id: "solberg", name: "Ingrid Solberg, PT" },
];

/** `when` is the first of the publication month; format with month + year. */
export type PressItem = { id: string; pub: string; when: string };

export const press: PressItem[] = [
  { id: "healthTechEurope", pub: "Health Tech Europe", when: "2026-03-01" },
  { id: "jdr", pub: "Journal of Digital Rehabilitation", when: "2026-01-01" },
  { id: "derStandard", pub: "Der Standard", when: "2025-11-01" },
  { id: "bpa", pub: "Bell's Palsy Association UK", when: "2025-09-01" },
];

export const extras = {
  extension: { price: 29 },
  consult: { price: 49 },
  trialDays: 7,
  referralDiscount: 15,
};

/** Euro amount formatted for the locale ("€89" en, "89 €" de/fr/pt, "€ 89" nl). */
export function money(n: number, locale: Locale): string {
  const hasDecimal = n % 1 !== 0;
  return new Intl.NumberFormat(localeRegions[locale], {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Day + short month ("14 Jun", "14 de jun.", "14. Juni"). */
export function fmtDateMD(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeRegions[locale], { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}

/** Month + year ("March 2026", "März 2026"). */
export function fmtMonthYear(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(localeRegions[locale], { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
}
