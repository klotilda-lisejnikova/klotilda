import { setRequestLocale } from "next-intl/server";
import LegalPage, { legalTitle } from "@/components/legal/LegalPage";

/**
 * The version in force; publishing a new one rebuilds the page at once (`/api/revalidate`), the
 * hourly regeneration only catches a missed call.
 */
export const revalidate = 3600;

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return { title: await legalTitle("withdrawal", locale) };
}

export default async function WithdrawalPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LegalPage kind="withdrawal" locale={locale} />;
}
