import "server-only";

import { isOutboundEmailConfigured } from "@/lib/outbound-email";
import { repeatOrderDiscountPercent, repeatOrderPromoCode } from "@/lib/repeat-purchase-discount";

export type MarketingStackStatus = {
  emailConfigured: boolean;
  metaPixelId: boolean;
  googleAdsId: boolean;
  googleMerchantCenter: boolean;
  repeatDiscountPercent: number;
  repeatPromoCode: string;
  winBackCode: string;
};

export function getMarketingStackStatus(): MarketingStackStatus {
  return {
    emailConfigured: isOutboundEmailConfigured(),
    metaPixelId: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()),
    googleAdsId: Boolean(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID?.trim()),
    googleMerchantCenter: Boolean(process.env.GOOGLE_MERCHANT_CENTER_ID?.trim()),
    repeatDiscountPercent: repeatOrderDiscountPercent(),
    repeatPromoCode: repeatOrderPromoCode(),
    winBackCode: process.env.MARKETING_WINBACK_CODE?.trim() || "REVINO10",
  };
}
