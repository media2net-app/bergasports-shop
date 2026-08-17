import "server-only";

import { isOutboundEmailConfigured } from "@/lib/outbound-email";
import { repeatOrderDiscountPercent, repeatOrderPromoCode } from "@/lib/repeat-purchase-discount";
import { getRuntimeSetting } from "@/lib/site-settings-db";

export type MarketingStackStatus = {
  emailConfigured: boolean;
  metaPixelId: boolean;
  googleAdsId: boolean;
  googleMerchantCenter: boolean;
  repeatDiscountPercent: number;
  repeatPromoCode: string;
  winBackCode: string;
};

export async function getMarketingStackStatus(): Promise<MarketingStackStatus> {
  const [emailConfigured, metaPixelId, googleAdsId, googleMerchantCenter, winBackCode] =
    await Promise.all([
      isOutboundEmailConfigured(),
      getRuntimeSetting("NEXT_PUBLIC_META_PIXEL_ID"),
      getRuntimeSetting("NEXT_PUBLIC_GOOGLE_ADS_ID"),
      getRuntimeSetting("GOOGLE_MERCHANT_CENTER_ID"),
      getRuntimeSetting("MARKETING_WINBACK_CODE"),
    ]);
  return {
    emailConfigured,
    metaPixelId: Boolean(metaPixelId.trim()),
    googleAdsId: Boolean(googleAdsId.trim()),
    googleMerchantCenter: Boolean(googleMerchantCenter.trim()),
    repeatDiscountPercent: await repeatOrderDiscountPercent(),
    repeatPromoCode: await repeatOrderPromoCode(),
    winBackCode: winBackCode.trim() || "TERUG10",
  };
}
