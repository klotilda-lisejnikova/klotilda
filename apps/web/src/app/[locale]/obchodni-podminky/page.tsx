import { setRequestLocale } from "next-intl/server";
import LegalPage, { legalTitle } from "@/components/legal/LegalPage";

/**
 * Static; lists the shipping prices from the API, so it is rebuilt when the admin changes them
 * (`/api/revalidate`), or at the latest after an hour.
 */
export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return { title: await legalTitle("terms", locale) };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage kind="terms" locale={locale} />;
}
