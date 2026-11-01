import { notFound } from "next/navigation";
import { ApiError } from "@eleansphere/entity-core";
import {
  fillLegalText,
  formatCzechDate,
  isLegalVersion,
} from "@klotilda/domain";
import type {
  LegalDocumentKey,
  LegalVersionSummary,
  PublishedLegalVersion,
} from "@klotilda/domain";
import { getLegalVersion, listLegalVersions } from "@/services";
import { loadStaticData } from "./static-data";

const NOT_FOUND = 404;

/** What a legal page shows: the version, the others published, and whether to warn of a draft. */
export interface LegalPageData {
  version: PublishedLegalVersion;
  /** Every published version, newest first; the first is the one in force. */
  versions: LegalVersionSummary[];
  /** Published before the seller's details were marked complete: the page says it's a draft. */
  draft: boolean;
}

async function loadFromApi(
  document: LegalDocumentKey,
  version: string | undefined,
): Promise<LegalPageData> {
  const [shown, versions] = await Promise.all([
    getLegalVersion(document, version),
    listLegalVersions(document),
  ]);
  return { version: shown, versions, draft: shown.seller.complete !== true };
}

/**
 * A legal page's data: the version in force, or the one `version` names (a page that doesn't
 * exist for a version never published). `null` only in a build with no API configured.
 */
export async function loadLegalPage(
  document: LegalDocumentKey,
  version?: string,
): Promise<LegalPageData | null> {
  if (version !== undefined && !isLegalVersion(version)) notFound();
  try {
    return await loadStaticData(
      "LegalPage",
      () => loadFromApi(document, version),
      null,
    );
  } catch (err) {
    if (err instanceof ApiError && err.status === NOT_FOUND) notFound();
    throw err;
  }
}

/** The version's text in the page's language, its placeholders filled from its own seller. */
export function legalSource(
  version: PublishedLegalVersion,
  locale: string,
): { text: string; czechOnly: boolean } {
  const english = locale === "en" ? version.body_en : null;
  return {
    text: fillLegalText(
      english ?? version.body_cs,
      version.seller,
      version.effectiveFrom,
    ),
    czechOnly: locale === "en" && english === null,
  };
}

/** "2. 11. 2026", as the pages name a version's date. */
export const versionDate = (summary: LegalVersionSummary) =>
  formatCzechDate(summary.effectiveFrom);
