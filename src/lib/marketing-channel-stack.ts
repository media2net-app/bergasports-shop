import "server-only";

import { getCronAdminStatus } from "@/lib/cron-admin-status";
import type { MarketingChannelId } from "@/lib/marketing-channels";
import { getMarketingStackStatus } from "@/lib/marketing-stack-status";
import { getTikTokCatalogHealth } from "@/lib/tiktok-catalog-health";

export type MarketingChannelStackItem = {
  ok: boolean;
  label: string;
};

export type MarketingChannelStackPanel = {
  title: string;
  items: MarketingChannelStackItem[];
};

function pixelSuffix(envKey: string): string | null {
  const raw = process.env[envKey]?.trim();
  if (!raw || raw.length < 4) {
    return null;
  }
  return `…${raw.slice(-4)}`;
}

export async function getMarketingChannelStackPanel(
  channelId: MarketingChannelId,
): Promise<MarketingChannelStackPanel | null> {
  if (channelId === "tiktok") {
    return null;
  }

  const stack = getMarketingStackStatus();

  switch (channelId) {
    case "meta": {
      const suffix = pixelSuffix("NEXT_PUBLIC_META_PIXEL_ID");
      return {
        title: "Meta stack",
        items: [
          {
            ok: stack.metaPixelId,
            label: stack.metaPixelId
              ? `Meta Pixel · Active${suffix ? ` ${suffix}` : ""}`
              : "Meta Pixel · Missing",
          },
          {
            ok: false,
            label: "Conversions API · Configure in Events Manager",
          },
        ],
      };
    }
    case "google_ads": {
      const suffix = pixelSuffix("NEXT_PUBLIC_GOOGLE_ADS_ID");
      return {
        title: "Google Ads",
        items: [
          {
            ok: stack.googleAdsId,
            label: stack.googleAdsId
              ? `Conversion tag · Active${suffix ? ` ${suffix}` : ""}`
              : "Conversion tag · Missing",
          },
          {
            ok: true,
            label: "Shopping / PMax · Link Merchant Center feed",
          },
        ],
      };
    }
    case "google_merchant": {
      const catalog = await getTikTokCatalogHealth();
      const merchantId = process.env.GOOGLE_MERCHANT_CENTER_ID?.trim();
      return {
        title: "Merchant feed",
        items: [
          {
            ok: stack.googleMerchantCenter,
            label: stack.googleMerchantCenter
              ? `Merchant Center · ${merchantId ?? "Connected"}`
              : "Merchant Center ID · Missing",
          },
          {
            ok: catalog.feedReady,
            label: catalog.feedReady
              ? `Product data · ${catalog.productsWithImage}/${catalog.productsVisible} with image`
              : `Product data · ${catalog.productsWithImage}/${catalog.productsVisible} images`,
          },
          {
            ok: catalog.productsInStock >= Math.floor(catalog.productsVisible * 0.5),
            label: `In stock · ${catalog.productsInStock}/${catalog.productsVisible} visible`,
          },
        ],
      };
    }
    case "email": {
      const cron = await getCronAdminStatus();
      return {
        title: "Email automation",
        items: [
          {
            ok: stack.emailConfigured,
            label: stack.emailConfigured ? "SMTP / Resend · Ready" : "Outbound email · Not configured",
          },
          {
            ok: cron.ok,
            label: `Win-back cron · ${cron.label}`,
          },
          {
            ok: true,
            label: `Promo codes · ${stack.winBackCode} win-back · ${stack.repeatPromoCode} repeat`,
          },
        ],
      };
    }
    default:
      return null;
  }
}
