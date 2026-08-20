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
  paymentStatusTone,
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
  const [sendcloudBusy, setSendcloudBusy] = useState(false);
  const [sendcloudMsg, setSendcloudMsg] = useState("");
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

  async function createSendcloudLabel() {
    setSendcloudBusy(true);
    setSendcloudMsg("");
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/sendcloud`, { method: "POST" });
      const data = (await res.json()) as { error?: string; label_url?: string | null; tracking_code?: string };
      if (!res.ok) {
        setError(data.error ?? "Sendcloud-label mislukt");
      } else {
        setSendcloudMsg(
          data.tracking_code
            ? `Label aangemaakt · ${data.tracking_code}`
            : "Sendcloud-label aangemaakt en gekoppeld.",
        );
        router.refresh();
      }
    } catch {
      setError("Geen verbinding");
    }
    setSendcloudBusy(false);
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

  return (
    <aside className="admin-product-editor-side" aria-label="Bestelling">
      {error ? <div className="admin-error-box">{error}</div> : null}
      {notice ? (
        <div className="admin-banner ok admin-m-0" role="status">
          {notice}
        </div>
      ) : null}

      <section className="admin-panel admin-stack-tight">
        <div className="admin-page-head">
          <h2 className="admin-h2 admin-m-0">Klant</h2>
          {editingCustomer ? (
            <button type="button" className="admin-link-action" disabled={busy} onClick={cancelCustomerEdit}>
              Annuleren
            </button>
          ) : (
            <button type="button" className="admin-link-action" onClick={() => setEditingCustomer(true)}>
              Bewerken
            </button>
          )}
        </div>

        {editingCustomer ? (
          <>
            <label className="admin-label">
              Naam
              <input className="admin-field admin-field--flush" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </label>
            <label className="admin-label">
              E-mail
              <input className="admin-field admin-field--flush" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
            </label>
            <label className="admin-label">
              Telefoon
              <input className="admin-field admin-field--flush" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </label>
            <p className="admin-pill-row-label">Factuuradres</p>
            <label className="admin-label">
              Adres
              <input className="admin-field admin-field--flush" value={billAddress} onChange={(e) => setBillAddress(e.target.value)} />
            </label>
            <div className="admin-split">
              <label className="admin-label">
                Postcode
                <input className="admin-field admin-field--flush" value={billPostal} onChange={(e) => setBillPostal(e.target.value)} />
              </label>
              <label className="admin-label">
                Plaats
                <input className="admin-field admin-field--flush" value={billCity} onChange={(e) => setBillCity(e.target.value)} />
              </label>
            </div>
            <label className="admin-label">
              Land / provincie
              <input className="admin-field admin-field--flush" value={billCounty} onChange={(e) => setBillCounty(e.target.value)} />
            </label>
            <p className="admin-pill-row-label">Verzendadres</p>
            <label className="admin-label">
              Adres
              <input className="admin-field admin-field--flush" value={shipAddress} onChange={(e) => setShipAddress(e.target.value)} />
            </label>
            <div className="admin-split">
              <label className="admin-label">
                Postcode
                <input className="admin-field admin-field--flush" value={shipPostal} onChange={(e) => setShipPostal(e.target.value)} />
              </label>
              <label className="admin-label">
                Plaats
                <input className="admin-field admin-field--flush" value={shipCity} onChange={(e) => setShipCity(e.target.value)} />
              </label>
            </div>
            <label className="admin-label">
              Land / provincie
              <input className="admin-field admin-field--flush" value={shipCounty} onChange={(e) => setShipCounty(e.target.value)} />
            </label>
            <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => void saveCustomer()}>
              {busy ? "Opslaan…" : "Opslaan"}
            </button>
          </>
        ) : (
          <div className="admin-table-customer">
            <span className="admin-table-customer-name">{order.customer_name}</span>
            {order.customer_email ? (
              <a href={`mailto:${order.customer_email}`}>{order.customer_email}</a>
            ) : null}
            {order.customer_phone ? (
              <a href={`tel:${order.customer_phone}`}>{order.customer_phone}</a>
            ) : null}
            {customerId ? (
              <Link href={`/admin/customers/${customerId}`}>Klantkaart</Link>
            ) : null}
            {showBilling ? (
              <>
                <p className="admin-pill-row-label">Factuuradres</p>
                {addressLines({
                  address: billing!.address,
                  postal_code: billing!.postal_code,
                  city: billing!.city,
                  county: billing!.county,
                }).map((line) => (
                  <p key={`b-${line}`} className="admin-muted admin-m-0">
                    {line}
                  </p>
                ))}
                <p className="admin-pill-row-label">Verzendadres</p>
              </>
            ) : (
              <p className="admin-pill-row-label">Adres</p>
            )}
            {addressLines({
              address: order.shipping_address,
              postal_code: order.shipping_postal_code,
              city: order.shipping_city,
              county: order.shipping_county,
            }).map((line) => (
              <p key={`s-${line}`} className="admin-muted admin-m-0">
                {line}
              </p>
            ))}
          </div>
        )}

        {customerNote ? (
          <>
            <p className="admin-pill-row-label">Klantopmerking</p>
            <p className="admin-muted admin-m-0">{customerNote}</p>
          </>
        ) : (
          <p className="admin-muted admin-m-0">Geen klantopmerking</p>
        )}
        <label className="admin-label">
          Interne notitie
          <textarea
            className="admin-field admin-field--flush admin-field--tall"
            value={staffNote}
            onChange={(e) => setStaffNote(e.target.value)}
          />
        </label>
        <button type="button" className="admin-link-action" disabled={busy} onClick={() => void saveInternalNote()}>
          {busy ? "Opslaan…" : "Notitie opslaan"}
        </button>
      </section>

      <section className="admin-panel admin-stack-tight">
        <h2 className="admin-h2 admin-m-0">Bezorging</h2>
        <div className="admin-pill-row" role="group" aria-label="Bezorgmethode">
          <button
            type="button"
            className={`admin-pill${!pickup ? " active" : ""}`}
            disabled={busy}
            onClick={() => void setMethod("standard")}
          >
            Verzenden
          </button>
          <button
            type="button"
            className={`admin-pill${pickup ? " active" : ""}`}
            disabled={busy}
            onClick={() => void setMethod("pickup")}
          >
            Ophalen
          </button>
        </div>

        {pickup ? (
          <p className="admin-muted admin-m-0">{pickupLocation}</p>
        ) : order.tracking_code || order.shipping_carrier ? (
          <>
            {order.shipping_carrier ? <p className="admin-m-0">{order.shipping_carrier}</p> : null}
            {order.tracking_code ? (
              <div className="admin-form-actions">
                {order.tracking_url ? (
                  <a href={order.tracking_url} target="_blank" rel="noreferrer" className="admin-td-mono">
                    {order.tracking_code}
                  </a>
                ) : (
                  <span className="admin-td-mono">{order.tracking_code}</span>
                )}
                <button type="button" className="admin-link-action" onClick={() => void copyTracking()}>
                  {copied ? "Gekopieerd" : "Kopieer"}
                </button>
                {order.tracking_url ? (
                  <a href={order.tracking_url} target="_blank" rel="noreferrer" className="admin-link-action">
                    Volgen
                  </a>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <p className="admin-muted admin-m-0">Nog geen tracking</p>
        )}

        {!pickup ? (
          <div className="admin-form-actions">
            {order.sendcloud_label_url ? (
              <a
                href={order.sendcloud_label_url}
                target="_blank"
                rel="noreferrer"
                className="admin-link-action"
              >
                Label PDF
              </a>
            ) : null}
            {order.sendcloud_parcel_id ? (
              <span className="admin-muted">Sendcloud #{order.sendcloud_parcel_id}</span>
            ) : (
              <button
                type="button"
                className="admin-link-action"
                disabled={busy || sendcloudBusy || !paid}
                onClick={() => void createSendcloudLabel()}
              >
                {sendcloudBusy ? "Label…" : "Sendcloud-label"}
              </button>
            )}
          </div>
        ) : null}
        {sendcloudMsg ? <p className="admin-muted admin-m-0">{sendcloudMsg}</p> : null}

        {shipAsk && step?.needsTracking ? (
          <>
            <label className="admin-label">
              Vervoerder
              <input
                className="admin-field admin-field--flush"
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                placeholder="PostNL, DHL…"
              />
            </label>
            <label className="admin-label">
              Trackingcode
              <input className="admin-field admin-field--flush" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} />
            </label>
            <label className="admin-label">
              Track-URL
              <input
                className="admin-field admin-field--flush"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://"
              />
            </label>
          </>
        ) : null}

        {step ? (
          <button type="button" className="admin-btn-primary" disabled={busy} onClick={() => void runNext()}>
            {busy ? "Bezig…" : shipAsk && step.needsTracking ? "Bevestig verzonden" : step.label}
          </button>
        ) : null}

        {order.customer_email ? (
          <>
            <label className="admin-label">
              E-mail opnieuw sturen
              <select
                className="admin-field admin-field--flush"
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
            <button type="button" className="admin-link-action" disabled={busy} onClick={() => void resendEmail()}>
              Mail opnieuw sturen
            </button>
          </>
        ) : null}
      </section>

      <section className="admin-panel admin-stack-tight">
        <h2 className="admin-h2 admin-m-0">Betaling</h2>
        <div className="admin-status-stack">
          <span className={`admin-dash-status admin-dash-status--${paymentStatusTone(order.payment_status)}`}>
            {paymentStatusLabel(order.payment_status)}
          </span>
          <span className="admin-muted">{paymentMethodLabel(order.payment_method)}</span>
        </div>
        <p className="admin-m-0 admin-td-mono">{formatProductPrice(order.total, order.currency)}</p>
        {order.refunded_at ? (
          <p className="admin-muted admin-m-0">
            Terugbetaald {formatProductPrice(order.refund_amount ?? 0, order.currency)}
          </p>
        ) : null}
        <div className="admin-form-actions">
          <a className="admin-link-action" href={`/admin/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
            Factuur
          </a>
          {canRefund && !refundOpen ? (
            <button type="button" className="admin-link-action" disabled={busy} onClick={() => setRefundOpen(true)}>
              Terugbetalen
            </button>
          ) : null}
          {canCancel ? (
            <button type="button" className="admin-link-action" disabled={busy} onClick={() => void cancel()}>
              Annuleren
            </button>
          ) : null}
          {canDelete ? (
            <button type="button" className="admin-link-action" disabled={busy} onClick={() => void remove()}>
              Verwijderen
            </button>
          ) : null}
        </div>
        {canRefund && refundOpen ? (
          <div className="admin-form-actions">
            <AdminMoneyInput
              className="admin-field admin-field--flush admin-table-num"
              min={0.01}
              max={remaining}
              value={refundAmount}
              onChange={setRefundAmount}
              aria-label="Terugbetalingsbedrag"
            />
            <button type="button" className="admin-link-action" disabled={busy} onClick={() => void refund()}>
              Bevestigen
            </button>
            <button type="button" className="admin-link-action" onClick={() => setRefundOpen(false)}>
              Sluiten
            </button>
          </div>
        ) : null}
      </section>
    </aside>
  );
}
