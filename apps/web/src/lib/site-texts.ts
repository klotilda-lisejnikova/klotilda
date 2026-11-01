import { unstable_cache } from "next/cache";
import type { SiteText } from "@klotilda/domain";
import { listSiteTexts } from "@/services";
import { loadStaticData } from "./static-data";

/** What `POST /api/revalidate` names to drop the cached texts. */
export const SITE_TEXTS_TAG = "site-texts";
const HOUR = 3600;

/** One request an hour at most, whatever the number of pages rendered meanwhile. */
const cachedSiteTexts = unstable_cache(listSiteTexts, [SITE_TEXTS_TAG], {
  revalidate: HOUR,
  tags: [SITE_TEXTS_TAG],
});

/** The admin's texts for the website; none without an API (the translation files stay). */
export function loadSiteTexts(): Promise<SiteText[]> {
  return loadStaticData("SiteTexts", cachedSiteTexts, []);
}
