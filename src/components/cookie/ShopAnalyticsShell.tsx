"use client";

import { Suspense, type ReactNode } from "react";

import MarketingPixels from "@/components/analytics/MarketingPixels";
import TikTokAttribution from "@/components/analytics/TikTokAttribution";
import LiveAnalyticsTracker from "@/components/analytics/LiveAnalyticsTracker";
import TikTokPixel from "@/components/analytics/TikTokPixel";
import { useCookieConsent } from "@/components/cookie/CookieConsentProvider";

type ShopAnalyticsShellProps = {
  children: ReactNode;
  tiktokPixelId?: string;
  metaPixelId?: string;
  googleAdsId?: string;
};

export default function ShopAnalyticsShell({
  children,
  tiktokPixelId,
  metaPixelId,
  googleAdsId,
}: ShopAnalyticsShellProps) {
  const { hasAnalytics, hasMarketing, ready } = useCookieConsent();

  return (
    <>
      {ready && hasMarketing ? <TikTokPixel pixelId={tiktokPixelId} /> : null}
      {ready && hasMarketing ? <MarketingPixels metaPixelId={metaPixelId} googleAdsId={googleAdsId} /> : null}
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
