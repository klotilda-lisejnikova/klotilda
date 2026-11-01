import { getRequestConfig } from "next-intl/server";
import { withSiteTexts } from "@klotilda/domain";
import { loadSiteTexts } from "@/lib/site-texts";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as "cs" | "en")) {
    locale = routing.defaultLocale;
  }

  // The translation files, with the texts the admin words (`SiteText`) laid over them.
  const files = (await import(`../../messages/${locale}.json`)).default;
  return {
    locale,
    messages: withSiteTexts(files, await loadSiteTexts(), locale),
  };
});
