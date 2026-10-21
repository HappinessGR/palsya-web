import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { LocaleSync } from "./components/LanguageSwitcher";
import { PreviewBanner } from "./components/PreviewBanner";
import { pageMetadata } from "../i18n/metadata";
import "../styles/tokens.css";
import "../styles/components.css";
import "../styles/auth.css";
import "../styles/marketing.css";
import "../styles/app.css";
import "./globals.css";
import "./tailwind.css";

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("common.meta");
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <ClerkProvider>
      <html lang={locale}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          <link
            href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500&family=Inter:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <LocaleSync />
            <PreviewBanner />
            {children}
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
