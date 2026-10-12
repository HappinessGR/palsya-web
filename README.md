This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Translations

The UI ships in English (default), Portuguese (pt-PT), Dutch, Spanish (es-ES), French, German and
Afrikaans, using [next-intl](https://next-intl.dev). The locale is not in the URL: it lives in a
`locale` cookie (set by the language switcher, mirrored to localStorage); first visits use the
browser's `Accept-Language`, then English. Config is in `i18n/`.

- Messages: `locales/<locale>/<namespace>.json` — one file per page/area. English is the source of
  truth; a key missing from another language falls back to English and logs a warning in development.
- Page titles/descriptions/Open Graph: `pageMetadata("<namespace>.meta")` from `i18n/metadata.ts`.
- Never hard-code user-facing text, `en-GB` date formats or `€` prefixes — use `t()`, `useFormatter()`
  or `money(n, locale)`.
- Adding a string: add it to `locales/en/<ns>.json`, then the same key to every other locale.

Checks:

```bash
node scripts/i18n-check.mjs          # every locale has exactly the English keys + matching ICU placeholders (--same: untranslated values)
node scripts/i18n-keys-used.mjs      # every key used in code exists
node scripts/i18n-scan.mjs           # hard-coded user-facing text in components
node scripts/i18n-render-check.mjs http://localhost:3000   # renders public pages in every locale, flags English leftovers
node scripts/i18n-review.mjs         # rebuilds locales/REVIEW.md (native-speaker / clinical review list)
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
