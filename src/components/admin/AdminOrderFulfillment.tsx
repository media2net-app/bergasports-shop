"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import AdminOrderStatusSelect from "@/components/admin/AdminOrderStatusSelect";
import { paymentMethodLabel, type OrderStatus, type OrderWithItems } from "@/lib/orders";
import { formatProductPrice } from "@/lib/products";

function buildOrderNotes(shippingLabel: string | null, couponCode: string | null, customerNote: string) {
  const lines: string[] = [];
  if (shippingLabel?.trim()) lines.push(`Verzending: ${shippingLabel.trim()}`);
  if (couponCode?.trim()) lines.push(`Coupon: ${couponCode.trim()}`);
  if (customerNote.trim()) lines.push(customerNote.trim());
  return lines.length ? lines.join("\n") : null;
}

function nextStep(status: OrderStatus): { status: OrderStatus; label: string } | null {
  if (status === "pending" || status === "confirmed" || status === "processing") {
    return { status: "shipped", label: "Markeer verzonden" };
  }
  if (status === "shipped") {
    return { status: "delivered", label: "Markeer afgeleverd" };
  }
  return null;
}

export default function AdminOrderFulfillment({
  order,
  shippingLabel,
  couponCode,
  customerNote,
}: {
  order: OrderWithItems;
  shippingLabel: string | null;
  couponCode: string | null;
  customerNote: string | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [customerName, setCustomerName] = useState(order.customer_name);
  const [customerEmail, setCustomerEmail] = useState(order.customer_email ?? "");
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone);
  const [address, setAddress] = useState(order.shipping_address);
  const [city, setCity] = useState(order.shipping_city);
  const [county, setCounty] = useState(order.shipping_county ?? "");
  const [postal, setPostal] = useState(order.shipping_postal_code ?? "");
  const [note, setNote] = useState(customerNote ?? "");
  const [trackingCode, setTrackingCode] = useState(order.tracking_code ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [carrier, setCarrier] = useState(order.shipping_carrier ?? "");
  const [refundAmount, setRefundAmount] = useState(
    String(Math.max(0, order.total - (order.refund_amount ?? 0)).toFixed(2)),
  );
  const [refundOpen, setRefundOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const remaining = Math.max(0, order.total - (order.refund_amount ?? 0));
  const canRefund = Boolean(order.mollie_payment_id) && remaining > 0.009;
  const canDelete =
    (order.status === "cancelled" || order.status === "awaiting_payment") &&
    order.payment_status !== "paid" &&
    order.payment_status !== "authorized";
  const addressLine = [order.shipping_postal_code, order.shipping_city, order.shipping_county]
    .filter((part) => part?.trim())
    .join(" ");
  const step = nextStep(order.status);

  function cancelEdit() {
    setCustomerName(order.customer_name);
    setCustomerEmail(order.customer_email ?? "");
    setCustomerPhone(order.customer_phone);
    setAddress(order.shipping_address);
    setCity(order.shipping_city);
    setCounty(order.shipping_county ?? "");
    setPostal(order.shipping_postal_code ?? "");
    setNote(customerNote ?? "");
    setTrackingCode(order.tracking_code ?? "");
    setTrackingUrl(order.tracking_url ?? "");
    setCarrier(order.shipping_carrier ?? "");
    setEditing(false);
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
        setEditing(false);
        router.refresh();
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function saveCustomer() {
    await patch(
      {
        customer_name: customerName,
        customer_email: customerEmail || null,
        customer_phone: customerPhone,
        shipping_address: address,
        shipping_city: city,
        shipping_county: county || null,
        shipping_postal_code: postal || null,
        notes: buildOrderNotes(shippingLabel, couponCode, note),
        tracking_code: trackingCode || null,
        tracking_url: trackingUrl || null,
        shipping_carrier: carrier || null,
      },
      "Gegevens opgeslagen.",
    );
  }

  async function markNext() {
    if (!step) return;
    await patch({ status: step.status });
  }

  async function sendcloud() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/sendcloud`, { method: "POST" });
      const data = (await res.json()) as {
        error?: string;
        tracking_code?: string;
        tracking_url?: string;
        label_url?: string | null;
      };
      if (!res.ok) {
        setError(data.error ?? "Sendcloud mislukt");
      } else {
        if (data.tracking_code) setTrackingCode(data.tracking_code);
        if (data.tracking_url) setTrackingUrl(data.tracking_url);
        if (data.label_url) window.open(data.label_url, "_blank");
        router.refresh();
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
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
        "Bestelling annuleren? Een openstaande Mollie-betaling wordt meegenomen. Betaalde orders blijven betaald tot je terugbetaalt.",
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
    const code = order.tracking_code?.trim();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Kopiëren mislukt");
    }
  }

  const paymentBits = [
    paymentMethodLabel(order.payment_method),
    formatProductPrice(order.total, order.currency),
  ];
  if (order.refunded_at) {
    paymentBits.push(`Terugbetaald ${formatProductPrice(order.refund_amount ?? 0, order.currency)}`);
  }

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
          {editing ? (
            <button type="button" className="admin-order-text-btn" disabled={busy} onClick={cancelEdit}>
              Annuleren
            </button>
          ) : (
            <button type="button" className="admin-order-text-btn" onClick={() => setEditing(true)}>
              Bewerken
            </button>
          )}
        </div>

        {editing ? (
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
            <label className="admin-order-field">
              Adres
              <input className="admin-order-input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
            <div className="admin-order-edit-split">
              <label className="admin-order-field">
                Postcode
                <input className="admin-order-input" value={postal} onChange={(e) => setPostal(e.target.value)} />
              </label>
              <label className="admin-order-field">
                Plaats
                <input className="admin-order-input" value={city} onChange={(e) => setCity(e.target.value)} />
              </label>
            </div>
            <label className="admin-order-field">
              Land / provincie
              <input className="admin-order-input" value={county} onChange={(e) => setCounty(e.target.value)} />
            </label>
            <label className="admin-order-field">
              Opmerking
              <textarea className="admin-order-input admin-order-input--area" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <label className="admin-order-field">
              Tracking
              <input
                className="admin-order-input"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                placeholder="Code"
              />
            </label>
            <label className="admin-order-field">
              Volgen
              <input
                className="admin-order-input"
                value={trackingUrl}
                onChange={(e) => setTrackingUrl(e.target.value)}
                placeholder="https://"
              />
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
          </div>
        )}
      </section>

      {!editing ? (
        <section className="admin-order-block">
          <p className="admin-order-label">Adres</p>
          <div className="admin-order-block-body">
            <p className="admin-order-value">{order.shipping_address}</p>
            {addressLine ? <p className="admin-order-value">{addressLine}</p> : null}
            {shippingLabel ? <p className="admin-order-value admin-order-value--mute">{shippingLabel}</p> : null}
            {customerNote ? <p className="admin-order-note">{customerNote}</p> : null}
          </div>
        </section>
      ) : null}

      {!editing ? (
        <section className="admin-order-block">
          <p className="admin-order-label">Zending</p>
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
              {order.sendcloud_label_url ? (
                <a href={order.sendcloud_label_url} target="_blank" rel="noreferrer" className="admin-order-text-btn">
                  Label
                </a>
              ) : null}
            </div>
          ) : (
            <p className="admin-order-value admin-order-value--mute">Nog geen tracking</p>
          )}
        </section>
      ) : null}

      <section className="admin-order-block">
        <p className="admin-order-label">Betaling</p>
        <p className="admin-order-value">{paymentBits.join(" · ")}</p>
      </section>

      <section className="admin-order-block admin-order-block--actions">
        <p className="admin-order-label">Acties</p>
        {step ? (
          <button type="button" className="admin-btn-primary" disabled={busy} onClick={() => void markNext()}>
            {busy ? "Bezig…" : step.label}
          </button>
        ) : null}
        <div className="admin-order-action-row">
          <a className="admin-order-text-btn" href={`/admin/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
            Factuur
          </a>
          {!order.tracking_code ? (
            <button type="button" className="admin-order-text-btn" disabled={busy} onClick={() => void sendcloud()}>
              Verzendlabel
            </button>
          ) : null}
          <AdminOrderStatusSelect orderId={order.id} currentStatus={order.status} />
        </div>
        {canRefund ? (
          refundOpen ? (
            <div className="admin-order-refund">
              <input
                className="admin-order-input admin-order-input--num"
                type="number"
                min={0.01}
                max={remaining}
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
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
        {order.status !== "cancelled" ? (
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
    </aside>
  );
}
