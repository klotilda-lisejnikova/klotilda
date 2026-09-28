import { setRequestLocale } from "next-intl/server";
import LegalPage, { legalTitle } from "@/components/legal/LegalPage";

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
