import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { SITE_TEXTS_TAG } from "@/lib/site-texts";
import { NextResponse, type NextRequest } from "next/server";

/** Compares in constant time; hashing first evens out the lengths too. */
function sameSecret(given: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

/**
 * `POST /api/revalidate` — the API calls it whenever the admin changes products, categories, the
 * gallery, the seller's details or the site's texts, publishes a legal text or decides on a
 * review, and when an order moves the stock, so the cached pages are rebuilt on the next visit
 * instead of when their `revalidate` interval runs out. Guarded by `REVALIDATE_SECRET`.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret || !sameSecret(authorization, `Bearer ${secret}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // The site is a handful of pages: every one of them, both languages.
  revalidateTag(SITE_TEXTS_TAG);
  revalidatePath("/", "layout");
  return NextResponse.json({ revalidated: true });
}
