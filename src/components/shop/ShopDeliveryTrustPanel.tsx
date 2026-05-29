import Link from "next/link";

import { SITE_DEFAULT_CURRENCY } from "@/lib/site-brand";
import {
  RETURNS_DAYS,
  RETURNS_POLICY_PATH,
  formatEstimatedDeliveryRange,
  formatFreeShippingThreshold,
  freeShippingThresholdAmount,
} from "@/lib/shop-delivery-trust";
import { formatProductPrice } from "@/lib/products";

type ShopDeliveryTrustPanelProps = {
  /** Winkelwagen-subtotaal (zelfde valuta als producten). */
  subtotalAmount?: number;
  currency?: string;
  /** Productvlag: altijd gratis verzending tonen. */
  freeCargo?: boolean;
  className?: string;
};

export default function ShopDeliveryTrustPanel({
  subtotalAmount,
  currency = SITE_DEFAULT_CURRENCY,
  freeCargo = false,
  className = "",
}: ShopDeliveryTrustPanelProps) {
  const deliveryRange = formatEstimatedDeliveryRange();
  const threshold = freeShippingThresholdAmount();
  const thresholdLabel = formatFreeShippingThreshold(currency);
  const qualifiesFree =
    freeCargo || (subtotalAmount != null && subtotalAmount >= threshold - 0.005);
  const remaining =
    subtotalAmount != null && !qualifiesFree ? Math.max(0, threshold - subtotalAmount) : null;

  return (
    <div
      className={`rounded-xl border border-[#e5dcc8] bg-[#faf8f4] p-4 text-sm text-[var(--foreground)]/90 ${className}`}
      aria-label="Verzending en retour"
    >
      <p className="font-semibold text-[var(--foreground)]">Geschatte levering</p>
      <p className="mt-1">
        Bestel nu — levering tussen{" "}
        <span className="font-semibold text-[var(--foreground)]">{deliveryRange}</span> (Nederland en België,
        werkdagen).
      </p>

      <p className="mt-3 font-semibold text-[var(--foreground)]">Verzendkosten</p>
      {qualifiesFree ? (
        <p className="mt-1 font-semibold text-[#16a34a]">Gratis verzending voor deze bestelling.</p>
      ) : remaining != null && remaining > 0.005 ? (
        <p className="mt-1">
          Voeg nog{" "}
          <span className="font-semibold">{formatProductPrice(remaining, currency)}</span> toe voor gratis
          verzending (vanaf {thresholdLabel}).
        </p>
      ) : (
        <p className="mt-1">
          Gratis verzending vanaf <span className="font-semibold">{thresholdLabel}</span>. Onder dit bedrag
          berekenen we de verzendkosten bij bevestiging.
        </p>
      )}

      <p className="mt-3 font-semibold text-[var(--foreground)]">Retour</p>
      <p className="mt-1">
        Je hebt <span className="font-semibold">{RETURNS_DAYS} kalenderdagen</span> om te retourneren, volgens
        ons beleid.{" "}
        <Link href={RETURNS_POLICY_PATH} className="font-semibold text-[#96741f] underline underline-offset-2">
          Verzending & retour
        </Link>
        .
      </p>
    </div>
  );
}
