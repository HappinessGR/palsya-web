import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { LocaleSync } from "./components/LanguageSwitcher";
import { EditModeRoot } from "./components/edit-mode/EditModeRoot";
import { pageMetadata } from "../i18n/metadata";
import "../styles/tokens.css";
import "../styles/components.css";
import "../styles/auth.css";
import "../styles/marketing.css";
import "../styles/app.css";
import "./globals.css";
import "./tailwind.css";

/** Site typeface, self-hosted by next/font and exposed as --font-sans (see styles/tokens.css). */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  style: ["normal", "italic"],
  variable: "--font-sans",
  display: "swap",
});

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata("common.meta");
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <ClerkProvider>
      <html lang={locale} className={jakarta.variable}>
        <body>
          <NextIntlClientProvider locale={locale} messages={messages}>
            <LocaleSync />
            {children}
            <EditModeRoot />
          </NextIntlClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
