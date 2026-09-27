/**
 * Feature flags. `NEXT_PUBLIC_*` is inlined at build time, so flipping a flag
 * means a redeploy — fine for a one-off launch toggle.
 *
 * Set `NEXT_PUBLIC_SHOP_ENABLED=true` on dev / preview; leave it unset in the
 * production Railway service until the e-shop (Fáze 4) is ready.
 */
export const SHOP_ENABLED = process.env.NEXT_PUBLIC_SHOP_ENABLED === "true";
