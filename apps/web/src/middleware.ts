import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { SHOP_ENABLED } from "./lib/features";

const intlMiddleware = createMiddleware(routing);

// `/shop`, `/shop/<id>`, `/checkout` and the shop's legal pages — with or without the `/cs` /
// `/en` prefix. The legal pages still carry placeholder seller details, so they stay off with it.
const SHOP_PATH =
  /^\/(?:(?:cs|en)\/)?(?:shop|checkout|obchodni-podminky|ochrana-osobnich-udaju|odstoupeni-od-smlouvy)(?:\/|$)/;

export default function middleware(request: NextRequest) {
  if (!SHOP_ENABLED && SHOP_PATH.test(request.nextUrl.pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
