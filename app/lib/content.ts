/**
 * Marketing-page content ported from the legacy prototype's
 * assets/js/content.js (window.P.content). Only structure lives here — ids,
 * numbers, dates and the order of list items. All user-facing text is in
 * locales/<locale>/{guides,pricing,stories,common}.json, keyed by these ids:
 *
 *   guides.articles.<slug>.{title,blurb}      guides.faq.<group>.items.<q>.{q,a}
 *   pricing.plans.<id>.{name,forWho,features.<feature>}
 *   stories.items.<id>.p<n>   stories.testimonials.<id>.*   common.medicalDisclaimer
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

/** The FAQ is public (/faq); every other guide is patient-only, inside the dashboard. */
export const guideHref = (a: Article) => (a.faq ? "/faq" : `/dashboard/library/${a.slug}`);

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

/**
 * Patient testimonials on /stories (real, originally written in Dutch). The
 * text is in locales/<locale>/stories.json as items.<id>.p1 … p<paragraphs>.
 */
export type Story = { id: string; name: string; country: string; date: string; paragraphs: number };

export const stories: Story[] = [
  { id: "paulS", name: "Paul S.", country: "NL", date: "2019-02-20", paragraphs: 7 },
  { id: "harryN", name: "Harry N.", country: "NL", date: "2018-12-12", paragraphs: 12 },
  { id: "corinaB", name: "Corina B.", country: "NL", date: "2018-11-10", paragraphs: 9 },
  { id: "brunoS", name: "Bruno S.", country: "NL", date: "2018-11-02", paragraphs: 6 },
  { id: "martijnP", name: "Martijn P.", country: "NL", date: "2018-05-30", paragraphs: 9 },
  { id: "anoukA", name: "Anouk A.", country: "NL", date: "2018-05-17", paragraphs: 9 },
  { id: "marcE", name: "Marc E.", country: "NL", date: "2018-03-17", paragraphs: 11 },
  { id: "anoukV", name: "Anouk V.", country: "NL", date: "2017-12-04", paragraphs: 11 },
  { id: "antjeP", name: "Antje P.", country: "NL", date: "2017-09-22", paragraphs: 10 },
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

/**
 * Clinical team (/team). Role, credentials, regulator and bio are translated
 * in locales/<locale>/team.json under members.<id>; `langs` are ISO 639-1
 * codes, shown with Intl.DisplayNames in the reader's language.
 * TODO(content): these people and registration numbers come from the
 * prototype. Replace them with the real team before relying on this page —
 * the page tells visitors the numbers can be verified.
 */
export type TeamMember = { id: string; name: string; regNo?: string; langs: string[] };

export const team: TeamMember[] = [
  { id: "reis", name: "Dr. Hana Reis", regNo: "48211", langs: ["pt", "en", "es"] },
  { id: "vogt", name: "Dr. Anders Vogt", regNo: "0092841", langs: ["da", "en", "de"] },
  { id: "brandt", name: "Ilse Brandt", regNo: "39104822891", langs: ["nl", "en", "de", "fr"] },
  { id: "okonjo", name: "Dr. Amara Okonjo", regNo: "PH108422", langs: ["en", "fr"] },
  { id: "moreau", name: "Dr. Léa Moreau", regNo: "751029384", langs: ["fr", "en", "it"] },
  { id: "weber", name: "Jonas Weber", langs: ["de", "en"] },
];

/** Public contact addresses shown on /contact and in the privacy notice. */
export const contactEmails = {
  hello: "hello@palsya.app",
  privacy: "privacy@palsya.app",
  clinicians: "clinicians@palsya.app",
} as const;

/** Date shown as "Last updated" on each legal page. */
export const legalUpdated = { privacy: "2026-08-12", terms: "2026-08-12", cookies: "2026-08-12" } as const;

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
