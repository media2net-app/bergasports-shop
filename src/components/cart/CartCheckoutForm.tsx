"use client";

import { useEffect, useState } from "react";
import type { CartItem } from "@/components/cart/CartProvider";
import TikTokCheckoutEvents from "@/components/analytics/TikTokCheckoutEvents";
import ApplePayButton from "@/components/payments/ApplePayButton";
import MollieMethodPicker from "@/components/payments/MollieMethodPicker";
import { useMollieMethods } from "@/components/payments/useMollieMethods";
import { formatMollieMethodNames, mollieMethodLabel } from "@/lib/mollie-methods";
import { getTtclidFromDocument } from "@/lib/tiktok-client";
import { tikTokIdentify } from "@/lib/tiktok-pixel";
import { formatProductPrice } from "@/lib/products";
import { LEGAL_PAGE_PATHS } from "@/lib/site-content";
import { trackCommerceEvent } from "@/components/analytics/AnalyticsScripts";
import Link from "next/link";

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
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [shippingCountry, setShippingCountry] = useState("NL");
  const [shippingMethod, setShippingMethod] = useState("standard");
  const [shippingRates, setShippingRates] = useState<
    Array<{ method: string; label: string; price: number }>
  >([]);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [mollieMethod, setMollieMethod] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const payableSubtotal = Math.max(0, subtotal - discountTotal - couponDiscount);
  const selectedShipping =
    shippingRates.find((r) => r.method === shippingMethod) ?? shippingRates[0];
  const shippingCost = selectedShipping?.price ?? 0;
  const payableTotal = Math.round((payableSubtotal + shippingCost) * 100) / 100;

  useEffect(() => {
    let cancelled = false;
    void fetch(
      `/api/shipping/quote?country=${encodeURIComponent(shippingCountry)}&subtotal=${payableSubtotal}`,
    )
      .then((r) => r.json())
      .then((data: { rates?: Array<{ method: string; label: string; price: number }> }) => {
        if (cancelled) return;
        const rates = data.rates ?? [];
        setShippingRates(rates);
        setShippingMethod((prev) => {
          const selected = rates.find((r) => r.method === prev) ?? rates[0];
          return selected?.method ?? prev;
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [shippingCountry, payableSubtotal]);

  const {
    methods: mollieMethods,
    fallback: mollieFallback,
    loading: mollieLoading,
    configured: mollieConfigured,
  } = useMollieMethods({
    amount: payableTotal,
    currency,
    country: shippingCountry,
  });
  const selectedMollieMethod =
    (mollieMethod && mollieMethods.some((m) => m.id === mollieMethod)
      ? mollieMethod
      : (mollieMethods.find((m) => m.id === "ideal")?.id ?? mollieMethods[0]?.id)) ?? "";
  const showApplePay =
    !mollieFallback && mollieMethods.some((m) => m.id === "applepay");

  const fieldClass =
    "mt-1 w-full rounded-xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-3 py-2.5 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--brand)]";
  const btnGold =
    "inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[var(--brand-mid)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-[#1a1a1a] transition hover:bg-[#f2d680] disabled:opacity-60";
  const btnGhost =
    "inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--brand-border)] px-5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--foreground)] transition hover:border-[var(--brand)] hover:text-[var(--brand)] disabled:opacity-60";

  function validateDetails(): boolean {
    if (!customerName.trim() || !customerPhone.trim() || !shippingAddress.trim() || !shippingCity.trim()) {
      setError("Vul naam, telefoon, adres en plaats in.");
      return false;
    }
    if (!customerEmail.trim()) {
      setError("E-mail is verplicht voor online betalen.");
      return false;
    }
    if (!legalAccepted) {
      setError("Accepteer de algemene voorwaarden en het privacybeleid.");
      return false;
    }
    setError("");
    return true;
  }

  async function applyCoupon() {
    setError("");
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: couponCode, subtotal }),
    });
    const data = (await res.json()) as { discount?: number; error?: string };
    if (!res.ok) {
      setCouponDiscount(0);
      setError(data.error || "Ongeldige code");
      return;
    }
    setCouponDiscount(data.discount ?? 0);
  }

  async function handleSubmit(forcedMethod?: string) {
    if (!validateDetails()) return;

    setError("");
    setLoading(true);
    trackCommerceEvent("begin_checkout", { value: payableTotal, currency });
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
          legalAccepted: true,
          paymentMethod: "mollie",
          mollieMethod: forcedMethod || selectedMollieMethod || undefined,
          shippingAddress,
          shippingCity,
          shippingCounty: shippingCounty || undefined,
          shippingPostalCode: shippingPostalCode || undefined,
          shippingCountry,
          shippingMethod,
          shippingCost,
          couponCode: couponCode || undefined,
          notes: notes || undefined,
          currency,
          subtotal,
          discountTotal: discountTotal + couponDiscount,
          total: payableTotal,
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
      const data = (await res.json()) as {
        error?: string;
        orderNumber?: string;
        checkoutUrl?: string;
        paymentMethod?: string;
      };
      if (!res.ok || !data.orderNumber) {
        setError(data.error ?? "De bestelling kon niet worden geplaatst.");
        setLoading(false);
        return;
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
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
    <div className="space-y-4">
      <TikTokCheckoutEvents items={items} total={total} currency={currency} />

      <div
        className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--foreground)]/40"
        aria-label="Checkout stappen"
      >
        <span className={step === "details" ? "text-[var(--brand)]" : ""}>1. Bezorging</span>
        <span aria-hidden className="text-[var(--brand-mid)]">
          →
        </span>
        <span className={step === "confirm" ? "text-[var(--brand)]" : ""}>2. Bevestigen</span>
      </div>

      {step === "details" ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (validateDetails()) setStep("confirm");
          }}
        >
          <p className="font-[family-name:var(--font-heading)] text-sm tracking-tight text-[var(--foreground)]">
            Bezorggegevens
          </p>

          <div className="rounded-2xl border border-[var(--brand-border)] bg-[var(--brand-surface)] px-4 py-3 text-xs leading-relaxed text-[var(--foreground)]/75">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--brand)]">Online betalen</p>
            <p className="mt-1">
              {!mollieConfigured && !mollieLoading
                ? "Online betalen is tijdelijk niet beschikbaar. Kies alvast een methode of neem contact op."
                : mollieFallback
                  ? "Kies hier je betaalmethode. Staat die niet aan, dan kies je verder op de beveiligde Mollie-pagina."
                  : `${formatMollieMethodNames(mollieMethods)} — veilig via Mollie.`}
            </p>
          </div>

          <div>
            <label htmlFor="co-country" className="text-xs font-medium text-[var(--foreground)]">
              Land *
            </label>
            <select
              id="co-country"
              className={fieldClass}
              value={shippingCountry}
              onChange={(e) => setShippingCountry(e.target.value)}
            >
              <option value="NL">Nederland</option>
              <option value="BE">België</option>
              <option value="DE">Duitsland</option>
              <option value="EU">Overig EU</option>
            </select>
          </div>

          {shippingRates.length > 0 ? (
            <fieldset className="space-y-2">
              <legend className="text-xs font-medium text-[var(--foreground)]">Verzending</legend>
              {shippingRates.map((rate) => (
                <label
                  key={rate.method}
                  className="flex cursor-pointer items-center justify-between gap-2 rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2.5 text-xs"
                >
                  <span className="inline-flex items-center gap-2">
                    <input
                      type="radio"
                      name="shipping"
                      checked={shippingMethod === rate.method}
                      onChange={() => setShippingMethod(rate.method)}
                    />
                    {rate.label}
                  </span>
                  <span>{formatProductPrice(rate.price, currency)}</span>
                </label>
              ))}
            </fieldset>
          ) : null}

          <MollieMethodPicker
            methods={mollieMethods}
            value={selectedMollieMethod}
            onChange={setMollieMethod}
            disabled={loading}
          />
          {!mollieConfigured && !mollieLoading ? (
            <p className="text-xs font-medium text-red-600">
              Online betalen is tijdelijk niet beschikbaar. Probeer later opnieuw of neem contact op.
            </p>
          ) : null}

          <div className="flex gap-2">
            <input
              placeholder="Kortingscode"
              className={fieldClass}
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
            />
            <button
              type="button"
              className="mt-1 shrink-0 rounded-full border border-[var(--brand-border)] px-4 text-[11px] font-bold uppercase tracking-[0.12em] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              onClick={() => void applyCoupon()}
            >
              Toepassen
            </button>
          </div>
          {couponDiscount > 0 ? (
            <p className="text-xs text-emerald-800">Korting: {formatProductPrice(couponDiscount, currency)}</p>
          ) : null}

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
              E-mail *
            </label>
            <input
              id="co-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={fieldClass}
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>
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

          <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2.5 text-xs text-[var(--foreground)]/85">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={marketingConsent}
              onChange={(e) => setMarketingConsent(e.target.checked)}
            />
            <span>
              Ik wil aanbiedingen en nieuws per e-mail ontvangen (optioneel) — inclusief welkomstkorting. Je kunt je
              altijd uitschrijven.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 rounded-2xl border border-[var(--brand-border)] bg-white px-3 py-2.5 text-xs text-[var(--foreground)]/85">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={legalAccepted}
              onChange={(e) => setLegalAccepted(e.target.checked)}
              required
            />
            <span>
              Ik ga akkoord met de{" "}
              <Link href={LEGAL_PAGE_PATHS.terms} className="underline">
                algemene voorwaarden
              </Link>
              , het{" "}
              <Link href={LEGAL_PAGE_PATHS.privacy} className="underline">
                privacybeleid
              </Link>{" "}
              en het{" "}
              <Link href={LEGAL_PAGE_PATHS.returns} className="underline">
                retourbeleid
              </Link>
              .
            </span>
          </label>

          {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

          <button type="submit" className={btnGold}>
            Ga naar bevestiging
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="font-[family-name:var(--font-heading)] text-sm tracking-tight text-[var(--foreground)]">
            Bevestig bestelling
          </p>
          <dl className="space-y-2 rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-surface)] p-4 text-sm text-[var(--foreground)]">
            <div>
              <dt className="text-xs text-[var(--foreground)]/65">Naam</dt>
              <dd className="font-medium">{customerName}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--foreground)]/65">Telefoon</dt>
              <dd className="font-medium">{customerPhone}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--foreground)]/65">E-mail</dt>
              <dd className="font-medium">{customerEmail}</dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--foreground)]/65">Adres</dt>
              <dd className="font-medium">
                {shippingAddress}, {shippingCity}
                {shippingCounty ? `, ${shippingCounty}` : ""}
                {shippingPostalCode ? ` ${shippingPostalCode}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--foreground)]/65">Verzending</dt>
              <dd className="font-medium">
                {shippingRates.find((r) => r.method === shippingMethod)?.label ?? shippingMethod} —{" "}
                {formatProductPrice(shippingCost, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--foreground)]/65">Betaling</dt>
              <dd className="font-medium">
                {selectedMollieMethod ? mollieMethodLabel(selectedMollieMethod) : "Kies bij Mollie"}
              </dd>
            </div>
            {notes ? (
              <div>
                <dt className="text-xs text-[var(--foreground)]/65">Opmerkingen</dt>
                <dd>{notes}</dd>
              </div>
            ) : null}
          </dl>

          <MollieMethodPicker
            methods={mollieMethods}
            value={selectedMollieMethod}
            onChange={setMollieMethod}
            disabled={loading}
          />
          {!mollieConfigured && !mollieLoading ? (
            <p className="text-xs font-medium text-red-600">
              Online betalen is tijdelijk niet beschikbaar. Neem contact op of probeer later opnieuw.
            </p>
          ) : mollieFallback ? (
            <p className="text-xs leading-relaxed text-[var(--foreground)]/65">
              Kies je methode hier. Als Mollie deze niet aan heeft staan, kies je verder op hun
              betaalpagina.
            </p>
          ) : null}

          <p className="text-base font-bold text-[var(--foreground)]">
            Totaal: {formatProductPrice(payableTotal, currency)}
          </p>

          {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}

          <div className="flex flex-col gap-2.5">
            {showApplePay ? (
              <ApplePayButton disabled={loading} onClick={() => void handleSubmit("applepay")} />
            ) : null}
            <button
              type="button"
              disabled={loading || !mollieConfigured}
              className={btnGold}
              onClick={() => void handleSubmit()}
            >
              {loading ? "Bezig…" : "Doorgaan naar betalen"}
            </button>
            <button type="button" className={btnGhost} onClick={() => setStep("details")} disabled={loading}>
              Terug naar bezorggegevens
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
