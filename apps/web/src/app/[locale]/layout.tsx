import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import "../globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import MotionProvider from "@/components/layout/MotionProvider";

// Absolute links in the page metadata (the share preview image, opengraph-image.jpg next to this
// file) point here; klotilda.cz redirects to www.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.klotilda.cz";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: t("title"),
      template: `%s | Klotilda`,
    },
    description: t("description"),
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      apple: "/apple-icon.png",
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      locale: locale === "cs" ? "cs_CZ" : "en_US",
      siteName: "Klotilda",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${geist.variable} font-sans antialiased`}>
        <NextIntlClientProvider messages={messages}>
          <MotionProvider>
            <div className="flex min-h-screen flex-col overflow-x-clip">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </MotionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
