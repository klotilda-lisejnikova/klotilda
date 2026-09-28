import { setRequestLocale } from "next-intl/server";
import LegalPage, { legalTitle } from "@/components/legal/LegalPage";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return { title: await legalTitle("privacy", locale) };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage kind="privacy" locale={locale} />;
}
