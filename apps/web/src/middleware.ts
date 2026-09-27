import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SHOP_ENABLED } from "./lib/features";

const intlMiddleware = createMiddleware(routing);

// `/shop`, `/shop/<id>`, `/checkout` — with or without the `/cs` / `/en` prefix.
const SHOP_PATH = /^\/(?:(?:cs|en)\/)?(?:shop|checkout)(?:\/|$)/;

export default function middleware(request: NextRequest) {
  if (!SHOP_ENABLED && SHOP_PATH.test(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
