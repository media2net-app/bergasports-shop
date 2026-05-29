"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

import { readMarketingConsentSync } from "@/lib/cookie-consent";
import { TIKTOK_TTCLID_COOKIE, TIKTOK_TTCLID_MAX_AGE_SEC } from "@/lib/tiktok-attribution";

/** Persists TikTok click id (ttclid) from ad landing URLs for Events API matching. */
export default function TikTokAttribution() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();

  useEffect(() => {
    if (pathname.startsWith("/admin") || !readMarketingConsentSync()) return;

    const ttclid = searchParams?.get("ttclid")?.trim();
    if (!ttclid) return;

    document.cookie = `${TIKTOK_TTCLID_COOKIE}=${encodeURIComponent(ttclid)}; max-age=${TIKTOK_TTCLID_MAX_AGE_SEC}; path=/; SameSite=Lax`;
  }, [pathname, searchParams]);

  return null;
}
