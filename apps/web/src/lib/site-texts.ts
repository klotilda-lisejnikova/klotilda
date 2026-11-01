import { unstable_cache } from "next/cache";
import { ApiError } from "@eleansphere/entity-core";
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

/**
 * The cached texts; none while the API has no texts route yet (a web deployed before its API):
 * the translation files stay, and the next render asks again.
 */
async function siteTextsOrNone(): Promise<SiteText[]> {
  try {
    return await cachedSiteTexts();
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return [];
    throw err;
  }
}

/** The admin's texts for the website; none without an API (the translation files stay). */
export function loadSiteTexts(): Promise<SiteText[]> {
  return loadStaticData("SiteTexts", siteTextsOrNone, []);
}
