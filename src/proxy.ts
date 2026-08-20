import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { adminSessionCookieName, verifyAdminSessionToken } from "@/lib/admin-auth";
import {
  DEV_LOCALE_COOKIE,
  isLocalDevHost,
  isLocaleCode,
  localeFromHost,
  stripLocalePrefix,
} from "@/lib/i18n/locale-shared";
import { matchStaticSeoRedirect, normalizeRedirectPath } from "@/lib/seo-redirects-static";

function resolveLocale(request: NextRequest, host: string | null): string {
  if (isLocalDevHost(host)) {
    const fromQuery = request.nextUrl.searchParams.get("lang")?.trim().toLowerCase();
    if (fromQuery && isLocaleCode(fromQuery)) return fromQuery;
    const fromCookie = request.cookies.get(DEV_LOCALE_COOKIE)?.value?.trim().toLowerCase();
    if (fromCookie && isLocaleCode(fromCookie)) return fromCookie;
  }
  return localeFromHost(host);
}

function withDevLocaleCookie(
  response: NextResponse,
  request: NextRequest,
  host: string | null,
  locale: string,
) {
  if (!isLocalDevHost(host)) return response;
  const fromQuery = request.nextUrl.searchParams.get("lang")?.trim().toLowerCase();
  if (fromQuery && isLocaleCode(fromQuery)) {
    response.cookies.set(DEV_LOCALE_COOKIE, fromQuery, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  } else if (!request.cookies.get(DEV_LOCALE_COOKIE)?.value) {
    response.cookies.set(DEV_LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
  }
  return response;
}

/** Next.js 16+: `middleware` heet `proxy` (zelfde gedrag). */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const { locale: prefixLocale, pathname: stripped } = stripLocalePrefix(pathname);
  const skipLocale =
    stripped.startsWith("/admin") ||
    stripped.startsWith("/api") ||
    stripped.startsWith("/_next") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/api");

  const locale = resolveLocale(request, host);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-bergasports-locale", locale);

  // Legacy pad-prefixes → 301 naar dezelfde URL zonder prefix
  if (!skipLocale && prefixLocale) {
    const url = request.nextUrl.clone();
    url.pathname = stripped;
    return withDevLocaleCookie(NextResponse.redirect(url, 301), request, host, locale);
  }

  if (
    !pathname.startsWith("/admin") &&
    !pathname.startsWith("/api") &&
    !pathname.startsWith("/_next")
  ) {
    const dest = matchStaticSeoRedirect(stripped);
    const from = normalizeRedirectPath(stripped);
    if (dest && dest !== from) {
      const url = request.nextUrl.clone();
      url.pathname = dest;
      return withDevLocaleCookie(NextResponse.redirect(url, 301), request, host, locale);
    }
  }

  if (!pathname.startsWith("/admin") && !pathname.startsWith("/api/admin")) {
    return withDevLocaleCookie(
      NextResponse.next({ request: { headers: requestHeaders } }),
      request,
      host,
      locale,
    );
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
