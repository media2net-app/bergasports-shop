"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import AdminMoneyInput from "@/components/admin/AdminMoneyInput";
import { formatMoneyInput } from "@/lib/money-input";
import {
  ORDER_STATUS_EMAIL_KIND_LABEL,
  ORDER_STATUS_EMAIL_KINDS,
  emailKindForFulfillmentStatus,
  type OrderStatusEmailKind,
} from "@/lib/order-email-kinds";
import {
  isPaidPaymentStatus,
  isPickupShippingLabel,
  orderAddressesDiffer,
  paymentMethodLabel,
  paymentOpsStatus,
  paymentStatusLabel,
  type OrderBillingAddress,
  type OrderStatus,
  type OrderWithItems,
} from "@/lib/orders";
import { formatProductPrice } from "@/lib/products";

function addressLines(input: {
  address: string;
  postal_code?: string | null;
  city: string;
  county?: string | null;
}) {
  return [
    input.address,
    [input.postal_code, input.city].filter((part) => part?.trim()).join(" "),
    input.county,
  ].filter((part) => part?.trim());
}

function nextOpsAction(
  paid: boolean,
  pickup: boolean,
  status: OrderStatus,
): { status: OrderStatus; label: string; needsTracking?: boolean } | null {
  if (!paid || status === "cancelled" || status === "delivered") return null;
  if (pickup) {
    if (status === "ready_for_pickup") {
      return { status: "delivered", label: "Opgehaald" };
    }
    if (status === "shipped") {
      return { status: "delivered", label: "Opgehaald" };
    }
    return { status: "ready_for_pickup", label: "Klaar voor ophalen" };
  }
  if (status !== "shipped") {
    return { status: "shipped", label: "Markeer verzonden", needsTracking: true };
  }
  return null;
}

export default function AdminOrderFulfillment({
  order,
  shippingLabel,
  customerNote,
  internalNote,
  billing,
  customerId,
  pickupLocation,
}: {
  order: OrderWithItems;
  shippingLabel: string | null;
  customerNote: string | null;
  internalNote: string | null;
  billing: OrderBillingAddress | null;
  customerId: string | null;
  pickupLocation: string;
}) {
  const router = useRouter();
  const pickup = isPickupShippingLabel(shippingLabel);
  const paid = isPaidPaymentStatus(order.payment_status);
  const paymentOps = paymentOpsStatus(order.payment_status);
  const remaining = Math.max(0, order.total - (order.refund_amount ?? 0));
  const canRefund =
    Boolean(order.mollie_payment_id) &&
    remaining > 0.009 &&
    (paid || order.payment_status === "partially_refunded");
  const canCancel = order.status !== "cancelled" && !paid && paymentOps !== "refunded";
  const canDelete =
    (order.status === "cancelled" || order.status === "awaiting_payment") &&
    !paid;
  const showBilling = orderAddressesDiffer(
    {
      address: order.shipping_address,
      postal_code: order.shipping_postal_code,
      city: order.shipping_city,
      county: order.shipping_county,
    },
    billing,
  );
  const step = nextOpsAction(paid, pickup, order.status);

  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerName, setCustomerName] = useState(order.customer_name);
  const [customerEmail, setCustomerEmail] = useState(order.customer_email ?? "");
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone);
  const [shipAddress, setShipAddress] = useState(order.shipping_address);
  const [shipCity, setShipCity] = useState(order.shipping_city);
  const [shipCounty, setShipCounty] = useState(order.shipping_county ?? "");
  const [shipPostal, setShipPostal] = useState(order.shipping_postal_code ?? "");
  const [billAddress, setBillAddress] = useState(billing?.address ?? order.shipping_address);
  const [billCity, setBillCity] = useState(billing?.city ?? order.shipping_city);
  const [billCounty, setBillCounty] = useState(billing?.county ?? order.shipping_county ?? "");
  const [billPostal, setBillPostal] = useState(billing?.postal_code ?? order.shipping_postal_code ?? "");
  const [staffNote, setStaffNote] = useState(internalNote ?? "");
  const [trackingCode, setTrackingCode] = useState(order.tracking_code ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [carrier, setCarrier] = useState(order.shipping_carrier ?? "");
  const [shipAsk, setShipAsk] = useState(false);
  const [refundAmount, setRefundAmount] = useState(() => formatMoneyInput(remaining, { min: 0.01, max: remaining }));
  const [refundOpen, setRefundOpen] = useState(false);
  const [emailKind, setEmailKind] = useState<OrderStatusEmailKind>(emailKindForFulfillmentStatus(order.status));
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  function cancelCustomerEdit() {
    setCustomerName(order.customer_name);
    setCustomerEmail(order.customer_email ?? "");
    setCustomerPhone(order.customer_phone);
    setShipAddress(order.shipping_address);
    setShipCity(order.shipping_city);
    setShipCounty(order.shipping_county ?? "");
    setShipPostal(order.shipping_postal_code ?? "");
    setBillAddress(billing?.address ?? order.shipping_address);
    setBillCity(billing?.city ?? order.shipping_city);
    setBillCounty(billing?.county ?? order.shipping_county ?? "");
    setBillPostal(billing?.postal_code ?? order.shipping_postal_code ?? "");
    setEditingCustomer(false);
  }

  async function patch(body: Record<string, unknown>, okMessage?: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Opslaan mislukt");
      } else {
        if (okMessage) setNotice(okMessage);
        setEditingCustomer(false);
        setShipAsk(false);
        router.refresh();
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function saveCustomer() {
    const sameAddress =
      billAddress.trim() === shipAddress.trim() &&
      billPostal.trim() === shipPostal.trim() &&
      billCity.trim() === shipCity.trim() &&
      billCounty.trim() === shipCounty.trim();
    await patch(
      {
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_phone: customerPhone,
        shipping_address: shipAddress,
        shipping_city: shipCity,
        shipping_county: shipCounty || null,
        shipping_postal_code: shipPostal || null,
        billing_address: sameAddress ? "" : billAddress,
        billing_city: sameAddress ? "" : billCity,
        billing_county: sameAddress ? "" : billCounty,
        billing_postal_code: sameAddress ? "" : billPostal,
      },
      "Klantgegevens opgeslagen.",
    );
  }

  async function saveInternalNote() {
    await patch({ internal_note: staffNote }, "Interne notitie opgeslagen.");
  }

  async function setMethod(method: "pickup" | "standard") {
    if ((method === "pickup") === pickup) return;
    await patch({ shipping_method: method }, method === "pickup" ? "Afhalen ingesteld." : "Verzenden ingesteld.");
  }

  async function runNext() {
    if (!step) return;
    if (step.needsTracking && !shipAsk) {
      setShipAsk(true);
      return;
    }
    await patch({
      status: step.status,
      ...(step.needsTracking
        ? {
            tracking_code: trackingCode || null,
            tracking_url: trackingUrl || null,
            shipping_carrier: carrier || null,
          }
        : {}),
    });
  }

  async function refund() {
    const amount = Number(refundAmount);
    const label = Number.isFinite(amount) ? formatProductPrice(amount, order.currency) : refundAmount;
    if (!confirm(`Terugbetaling van ${label} via Mollie uitvoeren?`)) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const data = (await res.json()) as { error?: string; full?: boolean };
      if (!res.ok) setError(data.error ?? "Terugbetaling mislukt");
      else {
        setRefundOpen(false);
        setNotice(data.full ? "Volledig terugbetaald; bestelling geannuleerd." : "Gedeeltelijke terugbetaling uitgevoerd.");
        router.refresh();
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function cancel() {
    if (
      !confirm(
        "Bestelling annuleren? Een openstaande Mollie-betaling wordt meegenomen.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/cancel`, { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        mollieCancelled?: boolean;
        mollieWarning?: string | null;
      };
      if (!res.ok) {
        setError(data.error ?? "Annuleren mislukt");
      } else {
        setNotice(
          data.mollieWarning ||
            (data.mollieCancelled ? "Bestelling en betaling geannuleerd." : "Bestelling geannuleerd."),
        );
        router.refresh();
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function remove() {
    if (!confirm("Deze bestelling definitief verwijderen? Dit kan niet ongedaan.")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Verwijderen mislukt");
        setBusy(false);
        return;
      }
      router.push("/admin/orders");
      router.refresh();
    } catch {
      setError("Geen verbinding");
      setBusy(false);
    }
  }

  async function copyTracking() {
    const code = (order.tracking_code || trackingCode).trim();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Kopiëren mislukt");
    }
  }

  async function resendEmail() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: emailKind }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "Mail versturen mislukt");
      else setNotice(`${ORDER_STATUS_EMAIL_KIND_LABEL[emailKind]} opnieuw verstuurd.`);
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  const paymentFact = [
    paymentStatusLabel(order.payment_status),
    paymentMethodLabel(order.payment_method),
    formatProductPrice(order.total, order.currency),
  ].join(" · ");

  return (
    <aside className="admin-order-side">
      {error ? <div className="admin-error-box">{error}</div> : null}
      {notice ? (
        <div className="admin-banner ok admin-m-0" role="status">
          {notice}
        </div>
      ) : null}

      <section className="admin-order-block">
        <div className="admin-order-block-head">
          <p className="admin-order-label">Klant</p>
          {editingCustomer ? (
            <button type="button" className="admin-order-text-btn" disabled={busy} onClick={cancelCustomerEdit}>
              Annuleren
            </button>
          ) : (
            <button type="button" className="admin-order-text-btn" onClick={() => setEditingCustomer(true)}>
              Adressen bewerken
            </button>
          )}
        </div>

        {editingCustomer ? (
          <div className="admin-order-edit">
            <label className="admin-order-field">
              Naam
              <input className="admin-order-input" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </label>
            <label className="admin-order-field">
              E-mail
              <input className="admin-order-input" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </label>
            <label className="admin-order-field">
              Telefoon
              <input className="admin-order-input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </label>
            <p className="admin-order-addr-kicker">Factuuradres</p>
            <label className="admin-order-field">
              Adres
              <input className="admin-order-input" value={billAddress} onChange={(e) => setBillAddress(e.target.value)} />
            </label>
            <div className="admin-order-edit-split">
              <label className="admin-order-field">
                Postcode
                <input className="admin-order-input" value={billPostal} onChange={(e) => setBillPostal(e.target.value)} />
              </label>
              <label className="admin-order-field">
                Plaats
                <input className="admin-order-input" value={billCity} onChange={(e) => setBillCity(e.target.value)} />
              </label>
            </div>
            <label className="admin-order-field">
              Land / provincie
              <input className="admin-order-input" value={billCounty} onChange={(e) => setBillCounty(e.target.value)} />
            </label>
            <p className="admin-order-addr-kicker">Verzendadres</p>
            <label className="admin-order-field">
              Adres
              <input className="admin-order-input" value={shipAddress} onChange={(e) => setShipAddress(e.target.value)} />
            </label>
            <div className="admin-order-edit-split">
              <label className="admin-order-field">
                Postcode
                <input className="admin-order-input" value={shipPostal} onChange={(e) => setShipPostal(e.target.value)} />
              </label>
              <label className="admin-order-field">
                Plaats
                <input className="admin-order-input" value={shipCity} onChange={(e) => setShipCity(e.target.value)} />
              </label>
            </div>
            <label className="admin-order-field">
              Land / provincie
              <input className="admin-order-input" value={shipCounty} onChange={(e) => setShipCounty(e.target.value)} />
            </label>
            <button type="button" className="admin-btn-primary" disabled={busy} onClick={() => void saveCustomer()}>
              {busy ? "Opslaan…" : "Opslaan"}
            </button>
          </div>
        ) : (
          <div className="admin-order-block-body">
            <p className="admin-order-customer">{order.customer_name}</p>
            {order.customer_email ? (
              <a className="admin-order-value-link" href={`mailto:${order.customer_email}`}>
                {order.customer_email}
              </a>
            ) : null}
            {order.customer_phone ? (
              <a className="admin-order-value-link" href={`tel:${order.customer_phone}`}>
                {order.customer_phone}
              </a>
            ) : null}
            {customerId ? (
              <Link className="admin-order-value-link" href={`/admin/customers/${customerId}`}>
                Klantkaart
              </Link>
            ) : null}
            {showBilling ? (
              <>
                <p className="admin-order-addr-kicker">Factuuradres</p>
                {addressLines({
                  address: billing!.address,
                  postal_code: billing!.postal_code,
                  city: billing!.city,
                  county: billing!.county,
                }).map((line) => (
                  <p key={`b-${line}`} className="admin-order-value">
                    {line}
                  </p>
                ))}
                <p className="admin-order-addr-kicker">Verzendadres</p>
              </>
            ) : (
              <p className="admin-order-addr-kicker">Adres</p>
            )}
            {addressLines({
              address: order.shipping_address,
              postal_code: order.shipping_postal_code,
              city: order.shipping_city,
              county: order.shipping_county,
            }).map((line) => (
              <p key={`s-${line}`} className="admin-order-value">
                {line}
              </p>
            ))}
          </div>
        )}
      </section>

      <section className="admin-order-block">
        <p className="admin-order-label">Bezorging</p>
        <div className="admin-order-method" role="group" aria-label="Bezorgmethode">
          <label>
            <input
              type="radio"
              name="ship-method"
              checked={!pickup}
              disabled={busy}
              onChange={() => void setMethod("standard")}
            />
            Verzenden
          </label>
          <label>
            <input
              type="radio"
              name="ship-method"
              checked={pickup}
              disabled={busy}
              onChange={() => void setMethod("pickup")}
            />
            Ophalen Dedemsvaart
          </label>
        </div>

        {pickup ? (
          <p className="admin-order-value">{pickupLocation}</p>
        ) : order.tracking_code || order.shipping_carrier ? (
          <div className="admin-order-block-body">
            {order.shipping_carrier ? <p className="admin-order-value">{order.shipping_carrier}</p> : null}
            {order.tracking_code ? (
              <div className="admin-order-track">
                {order.tracking_url ? (
                  <a href={order.tracking_url} target="_blank" rel="noreferrer" className="admin-order-track-code">
                    {order.tracking_code}
                  </a>
                ) : (
                  <span className="admin-order-track-code">{order.tracking_code}</span>
                )}
                <button type="button" className="admin-order-text-btn" onClick={() => void copyTracking()}>
                  {copied ? "Gekopieerd" : "Kopieer"}
                </button>
                {order.tracking_url ? (
                  <a href={order.tracking_url} target="_blank" rel="noreferrer" className="admin-order-text-btn">
                    Volgen
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <p className="admin-order-value admin-order-value--mute">Nog geen tracking</p>
        )}

        {shipAsk && step?.needsTracking ? (
          <div className="admin-order-edit">
            <label className="admin-order-field">
              Vervoerder
              <input className="admin-order-input" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="PostNL, DHL…" />
            </label>
            <label className="admin-order-field">
              Trackingcode
              <input className="admin-order-input" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} />
            </label>
            <label className="admin-order-field">
              Track-URL
              <input className="admin-order-input" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} placeholder="https://" />
            </label>
          </div>
        ) : null}

        {step ? (
          <button type="button" className="admin-btn-primary" disabled={busy} onClick={() => void runNext()}>
            {busy ? "Bezig…" : shipAsk && step.needsTracking ? "Bevestig verzonden" : step.label}
          </button>
        ) : null}
      </section>

      <section className="admin-order-block">
        <p className="admin-order-label">Betaling</p>
        <p className="admin-order-value">{paymentFact}</p>
        {order.refunded_at ? (
          <p className="admin-order-value admin-order-value--mute">
            Terugbetaald {formatProductPrice(order.refund_amount ?? 0, order.currency)}
          </p>
        ) : null}
        <a className="admin-order-text-btn" href={`/admin/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
          Factuur
        </a>
        {canRefund ? (
          refundOpen ? (
            <div className="admin-order-refund">
              <AdminMoneyInput
                className="admin-order-input admin-order-input--num"
                min={0.01}
                max={remaining}
                value={refundAmount}
                onChange={setRefundAmount}
                aria-label="Terugbetalingsbedrag"
              />
              <button type="button" className="admin-order-text-btn" disabled={busy} onClick={() => void refund()}>
                Bevestigen
              </button>
              <button type="button" className="admin-order-text-btn admin-order-text-btn--mute" onClick={() => setRefundOpen(false)}>
                Sluiten
              </button>
            </div>
          ) : (
            <button type="button" className="admin-order-text-btn" disabled={busy} onClick={() => setRefundOpen(true)}>
              Terugbetalen
            </button>
          )
        ) : null}
        {canCancel ? (
          <button type="button" className="admin-order-text-btn admin-order-text-btn--danger" disabled={busy} onClick={() => void cancel()}>
            Annuleren
          </button>
        ) : null}
        {canDelete ? (
          <button type="button" className="admin-order-text-btn admin-order-text-btn--danger" disabled={busy} onClick={() => void remove()}>
            Verwijderen
          </button>
        ) : null}
      </section>

      <section className="admin-order-block">
        <p className="admin-order-label">Notities</p>
        {customerNote ? (
          <div className="admin-order-block-body">
            <p className="admin-order-addr-kicker">Klantopmerking</p>
            <p className="admin-order-note">{customerNote}</p>
          </div>
        ) : (
          <p className="admin-order-value admin-order-value--mute">Geen klantopmerking</p>
        )}
        <label className="admin-order-field">
          Interne notitie
          <textarea
            className="admin-order-input admin-order-input--area"
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
          />
        </label>
        <button type="button" className="admin-order-text-btn" disabled={busy} onClick={() => void saveInternalNote()}>
          {busy ? "Opslaan…" : "Notitie opslaan"}
        </button>
      </section>

      {order.customer_email ? (
        <section className="admin-order-block">
          <p className="admin-order-label">E-mail</p>
          <label className="admin-order-field">
            Type
            <select
              className="admin-order-select admin-order-select--box"
              value={emailKind}
              disabled={busy}
              onChange={(e) => setEmailKind(e.target.value as OrderStatusEmailKind)}
            >
              {ORDER_STATUS_EMAIL_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {ORDER_STATUS_EMAIL_KIND_LABEL[kind]}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="admin-order-text-btn" disabled={busy} onClick={() => void resendEmail()}>
            Mail opnieuw sturen
          </button>
        </section>
      ) : null}
    </aside>
  );
}
