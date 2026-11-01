"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

/** A query parameter that is a personal key (the review link's), never sent to analytics. */
const PRIVATE_PARAMS = ["token"];

/** The event with the page's personal keys taken out of its URL. */
function withoutPrivateParams<T extends { url: string }>(event: T): T {
  const url = new URL(event.url);
  PRIVATE_PARAMS.forEach((name) => url.searchParams.delete(name));
  return { ...event, url: url.toString() };
}

/** Vercel's page analytics and speed insights, without the personal keys in a page's address. */
export default function SiteAnalytics() {
  return (
    <>
      <Analytics beforeSend={withoutPrivateParams} />
      <SpeedInsights beforeSend={withoutPrivateParams} />
    </>
  );
}
