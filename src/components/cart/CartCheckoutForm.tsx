"use client";

import { useState } from "react";
import type { CartItem } from "@/components/cart/CartProvider";
import TikTokCheckoutEvents from "@/components/analytics/TikTokCheckoutEvents";
import { getTtclidFromDocument } from "@/lib/tiktok-client";
import { tikTokIdentify } from "@/lib/tiktok-pixel";
import { formatProductPrice } from "@/lib/products";

type CartCheckoutFormProps = {
  items: CartItem[];
  currency: string;
  subtotal: number;
  discountTotal: number;
  total: number;
  onSuccess: (orderNumber: string) => void;
};

type CheckoutStep = "details" | "confirm";

function lineUnitPrice(item: CartItem) {
  return item.price;
}

function lineTotal(item: CartItem) {
  return lineUnitPrice(item) * item.quantity;
}

export default function CartCheckoutForm({
  items,
  currency,
  subtotal,
  discountTotal,
  total,
  onSuccess,
}: CartCheckoutFormProps) {
  const [step, setStep] = useState<CheckoutStep>("details");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingCounty, setShippingCounty] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [notes, setNotes] = useState("");
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fieldClass =
    "mt-1 w-full rounded-lg border border-[#e5dcc8] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[#B38F27]";

  function validateDetails(): boolean {
    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim() || !shippingCity.trim()) {
      setError("Vul naam, telefoon, adres en plaats in.");
      return false;
    }
    setError("");
    return true;
  }

  async function handleSubmit() {
    if (!validateDetails()) return;

    setError("");
    setLoading(true);
    try {
      await tikTokIdentify({
        email: customerEmail || undefined,
        phone: customerPhone,
      });

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail: customerEmail || undefined,
          marketingConsent,
          shippingAddress,
          shippingCity,
          shippingCounty: shippingCounty || undefined,
          shippingPostalCode: shippingPostalCode || undefined,
          notes: notes || undefined,
          currency,
          subtotal,
          discountTotal,
          total,
          items: items.map((item) => ({
            productId: item.productId,
            lineId: item.lineId,
            name: item.name,
            quantity: item.quantity,
            unitPrice: lineUnitPrice(item),
            lineTotal: lineTotal(item),
            currency: item.currency,
            image: item.image,
            variationLabel: item.variationLabel,
            bundleTierId: item.selectedBundleTierId,
          })),
          ttclid: getTtclidFromDocument() ?? undefined,
        }),
      });
      const data = (await res.json()) as { error?: string; orderNumber?: string };
      if (!res.ok || !data.orderNumber) {
        setError(data.error ?? "De bestelling kon niet worden geplaatst.");
        setLoading(false);
        return;
      }
      await tikTokIdentify({ externalId: data.orderNumber });
      onSuccess(data.orderNumber);
    } catch {
      setError("Netwerkfout. Probeer het opnieuw.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-[#e5dcc8] pt-4">
      <TikTokCheckoutEvents items={items} total={total} currency={currency} />

      <div className="flex items-center gap-2 text-xs font-semibold text-[var(--foreground)]/70" aria-label="Checkout stappen">
        <span className={step === "details" ? "text-[var(--foreground)]" : ""}>1. Bezorging</span>
        <span aria-hidden>→</span>
        <span className={step === "confirm" ? "text-[var(--foreground)]" : ""}>2. Bevestigen</span>
      </div>

      {step === "details" ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (validateDetails()) setStep("confirm");
          }}
        >
          <p className="text-sm font-semibold text-[var(--foreground)]">Bezorggegevens</p>
          <div className="rounded-lg border border-[#e5dcc8] bg-[#faf8f4] px-3 py-2 text-xs text-[var(--foreground)]/85">
            <p className="font-semibold text-[var(--foreground)]">Rembours (betaling bij aflevering)</p>
            <p className="mt-1">Je betaalt contant of met pin bij ontvangst van het pakket.</p>
          </div>

          <div>
            <label htmlFor="co-name" className="text-xs font-medium text-[var(--foreground)]">
              Volledige naam *
            </label>
            <input
              id="co-name"
              name="name"
              required
              autoComplete="name"
              className={fieldClass}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="co-phone" className="text-xs font-medium text-[var(--foreground)]">
              Telefoon *
            </label>
            <input
              id="co-phone"
              name="tel"
              type="tel"
              required
              autoComplete="tel"
              className={fieldClass}
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="co-email" className="text-xs font-medium text-[var(--foreground)]">
              E-mail
            </label>
            <input
              id="co-email"
              name="email"
              type="email"
              autoComplete="email"
              className={fieldClass}
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#e5dcc8] bg-white px-3 py-2.5 text-xs text-[var(--foreground)]/85">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
            />
            <span>
              Ik wil aanbiedingen en nieuws per e-mail ontvangen (optioneel). Je kunt je altijd uitschrijven.
            </span>
          </label>
          <div>
            <label htmlFor="co-address" className="text-xs font-medium text-[var(--foreground)]">
              Adres (straat + huisnummer) *
            </label>
            <input
              id="co-address"
              name="address-line1"
              required
              autoComplete="street-address"
              className={fieldClass}
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="co-city" className="text-xs font-medium text-[var(--foreground)]">
                Plaats *
              </label>
              <input
                id="co-city"
                name="address-level2"
                required
                autoComplete="address-level2"
                className={fieldClass}
                value={shippingCity}
                onChange={(e) => setShippingCity(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="co-county" className="text-xs font-medium text-[var(--foreground)]">
                Provincie
              </label>
              <input
                id="co-county"
                name="address-level1"
                autoComplete="address-level1"
                className={fieldClass}
                value={shippingCounty}
                onChange={(e) => setShippingCounty(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="co-postal" className="text-xs font-medium text-[var(--foreground)]">
              Postcode
            </label>
            <input
              id="co-postal"
              name="postal-code"
              autoComplete="postal-code"
              className={fieldClass}
              value={shippingPostalCode}
              onChange={(e) => setShippingPostalCode(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="co-notes" className="text-xs font-medium text-[var(--foreground)]">
              Opmerkingen
            </label>
            <textarea
              id="co-notes"
              rows={2}
              className={fieldClass}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-xl bg-[#B38F27] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#96741f]"
          >
            Ga naar bevestiging
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-[var(--foreground)]">Bevestig bestelling</p>
          <dl className="space-y-2 rounded-lg border border-[#e5dcc8] bg-[#faf9fc] p-3 text-sm text-[var(--foreground)]">
            <div>
              <dt className="text-xs text-[var(--foreground)]/65">Naam</dt>
              <dd className="font-medium">{customerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--foreground)]/65">Telefoon</dt>
              <dd className="font-medium">{customerPhone}</dd>
            </div>
            {customerEmail ? (
              <div>
                <dt className="text-xs text-[var(--foreground)]/65">E-mail</dt>
                <dd className="font-medium">{customerEmail}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-[var(--foreground)]/65">Adres</dt>
              <dd className="font-medium">
                {shippingAddress}, {shippingCity}
                {shippingCounty ? `, ${shippingCounty}` : ""}
                {shippingPostalCode ? ` ${shippingPostalCode}` : ""}
              </dd>
            </div>
            {notes ? (
              <div>
                <dt className="text-xs text-[var(--foreground)]/65">Opmerkingen</dt>
                <dd>{notes}</dd>
              </div>
            ) : null}
          </dl>

          <p className="text-base font-bold text-[var(--foreground)]">
            Totaal bij aflevering: {formatProductPrice(total, currency)}
          </p>

          {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={loading}
              className="w-full rounded-xl bg-[#B38F27] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#96741f] disabled:opacity-60"
              onClick={() => void handleSubmit()}
            >
              {loading ? "Bezig met verzenden…" : "Bestelling plaatsen"}
            </button>
            <button
              type="button"
              className="w-full rounded-xl border border-[#e5dcc8] px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
              onClick={() => setStep("details")}
              disabled={loading}
            >
              Terug naar bezorggegevens
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
