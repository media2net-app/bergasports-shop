"use client";

import { Suspense, type ReactNode } from "react";

import TikTokAttribution from "@/components/analytics/TikTokAttribution";
import LiveAnalyticsTracker from "@/components/analytics/LiveAnalyticsTracker";
import TikTokPixel from "@/components/analytics/TikTokPixel";
import { useCookieConsent } from "@/components/cookie/CookieConsentProvider";

export default function ShopAnalyticsShell({ children }: { children: ReactNode }) {
  const { hasAnalytics, hasMarketing, ready } = useCookieConsent();

  return (
    <>
      {ready && hasMarketing ? <TikTokPixel /> : null}
      {ready && hasMarketing ? (
        <Suspense fallback={null}>
          <TikTokAttribution />
        </Suspense>
      ) : null}
      {children}
      {ready && hasAnalytics ? <LiveAnalyticsTracker /> : null}
    </>
  );
}
