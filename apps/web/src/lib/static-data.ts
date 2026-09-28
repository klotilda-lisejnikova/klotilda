/**
 * Loads the data of a statically generated (ISR) page. A failure is rethrown, so Next keeps
 * serving the last good version instead of caching an empty page for the whole revalidate
 * window. Only a build with no API configured at all (CI) renders the fallback.
 */
export async function loadStaticData<T>(
  what: string,
  load: () => Promise<T>,
  fallback: T,
): Promise<T> {
  try {
    return await load();
  } catch (err) {
    if (process.env.NEXT_PUBLIC_API_URL) throw err;
    console.warn(`[${what}] No API configured, rendering without data.`);
    return fallback;
  }
}
