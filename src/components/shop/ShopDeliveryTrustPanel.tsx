import Link from "next/link";

import { getRequestLocale } from "@/lib/i18n/locale";
import { ui } from "@/lib/i18n/ui";
import { SITE_DEFAULT_CURRENCY } from "@/lib/site-brand";
import {
  RETURNS_DAYS,
  RETURNS_POLICY_PATH,
  formatEstimatedDeliveryRange,
  formatFreeShippingThreshold,
  freeShippingThresholdAmount,
  meetsFreeShippingThreshold,
} from "@/lib/shop-delivery-trust";
import { formatProductPrice } from "@/lib/products";

type ShopDeliveryTrustPanelProps = {
  /** Winkelwagen-subtotaal (zelfde valuta als producten). */
  subtotalAmount?: number;
  currency?: string;
  /** Productvlag: altijd gratis verzending tonen. */
  freeCargo?: boolean;
  className?: string;
  freeShippingThreshold?: number;
};

export default async function ShopDeliveryTrustPanel({
  subtotalAmount,
  currency = SITE_DEFAULT_CURRENCY,
  freeCargo = false,
  className = "",
  freeShippingThreshold,
}: ShopDeliveryTrustPanelProps) {
  const locale = await getRequestLocale();
  const t = ui(locale);
  const deliveryRange = formatEstimatedDeliveryRange();
  const threshold = freeShippingThreshold ?? freeShippingThresholdAmount();
  const thresholdLabel = formatFreeShippingThreshold(currency, threshold);
  const qualifiesFree =
    freeCargo || (subtotalAmount != null && meetsFreeShippingThreshold(subtotalAmount, threshold));
  const remaining =
    subtotalAmount != null && !qualifiesFree ? Math.max(0, threshold - subtotalAmount) : null;

  return (
    <div
      className={`rounded-xl border border-[#e5dcc8] bg-[#faf8f4] p-4 text-sm text-[var(--foreground)]/90 ${className}`}
      aria-label={t.shippingReturnsAria}
    >
      <p className="font-semibold text-[var(--foreground)]">{t.estimatedDelivery}</p>
      <p className="mt-1">{t.orderNowDelivery(deliveryRange)}</p>

      <p className="mt-3 font-semibold text-[var(--foreground)]">{t.shippingCost}</p>
      {qualifiesFree ? (
        <p className="mt-1 font-semibold text-[#16a34a]">{t.freeShippingThisOrder}</p>
      ) : remaining != null && remaining > 0.005 ? (
        <p className="mt-1">
          {t.addMoreForFreeShipping(formatProductPrice(remaining, currency), thresholdLabel)}
        </p>
      ) : (
        <p className="mt-1">{t.freeShippingFromThreshold(thresholdLabel)}</p>
      )}

      <p className="mt-3 font-semibold text-[var(--foreground)]">{t.returnsHeading}</p>
      <p className="mt-1">
        {t.returnsBody(RETURNS_DAYS)}{" "}
        <Link href={RETURNS_POLICY_PATH} className="font-semibold text-[#96741f] underline underline-offset-2">
          {t.shippingAndReturns}
        </Link>
        .
      </p>
    </div>
  );
}
