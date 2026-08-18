import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import { localeFromHost } from "@/lib/i18n/locale-shared";
import { matchStaticSeoRedirect, normalizeRedirectPath } from "@/lib/seo-redirects-static";

/** Next.js 16+: `middleware` heet `proxy` (zelfde gedrag). */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const locale = localeFromHost(host);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-bergasports-locale", locale);

  if (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next")
  ) {
    const dest = matchStaticSeoRedirect(pathname);
    const from = normalizeRedirectPath(pathname);
    if (dest && dest !== from) {
      const url = request.nextUrl.clone();
      url.pathname = dest;
      return NextResponse.redirect(url, 301);
    }
  }

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
    const token = request.cookies.get(adminSessionCookieName())?.value;
    if (token && (await verifyAdminSessionToken(token))) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (pathname === "/api/admin/login") {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret || secret.length < 16) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Admin not configured (ADMIN_JWT_SECRET)" }, { status: 503 });
    }
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("err", "config");
    return NextResponse.redirect(login);
  }

  const token = request.cookies.get(adminSessionCookieName())?.value;
  if (!token || !(await verifyAdminSessionToken(token))) {
    if (pathname.startsWith("/api/admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
