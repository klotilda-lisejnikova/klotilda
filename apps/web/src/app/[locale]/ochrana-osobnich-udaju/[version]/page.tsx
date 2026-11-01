import { setRequestLocale } from "next-intl/server";
import LegalPage, { legalTitle } from "@/components/legal/LegalPage";

/**
 * A published version never changes, but the list of the others and the notice of a newer one do:
 * rendered on its first visit, rebuilt when the website is told (`/api/revalidate`) and daily.
 */
export const revalidate = 86400;

interface Props {
  params: Promise<{ locale: string; version: string }>;
}

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props) {
  const { locale, version } = await params;
  return { title: `${await legalTitle("privacy", locale)} ${version}` };
}

export default async function PrivacyVersionPage({ params }: Props) {
  const { locale, version } = await params;
  setRequestLocale(locale);
  return <LegalPage kind="privacy" locale={locale} version={version} />;
}
