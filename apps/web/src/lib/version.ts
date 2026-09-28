/**
 * The version shown in the footer, e.g. `v0.1.0`, or `v0.1.0 · 5d1bd33` on a test build.
 * Both values are inlined by next.config.ts at build time.
 */
const commit = process.env.NEXT_PUBLIC_APP_COMMIT;

export const APP_VERSION = `v${process.env.NEXT_PUBLIC_APP_VERSION}${commit ? ` · ${commit}` : ""}`;
