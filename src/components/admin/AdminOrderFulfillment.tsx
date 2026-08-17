"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import type { OrderWithItems } from "@/lib/orders";

export default function AdminOrderFulfillment({ order }: { order: OrderWithItems }) {
  const router = useRouter();
  const [customerName, setCustomerName] = useState(order.customer_name);
  const [customerEmail, setCustomerEmail] = useState(order.customer_email ?? "");
  const [customerPhone, setCustomerPhone] = useState(order.customer_phone);
  const [address, setAddress] = useState(order.shipping_address);
  const [city, setCity] = useState(order.shipping_city);
  const [county, setCounty] = useState(order.shipping_county ?? "");
  const [postal, setPostal] = useState(order.shipping_postal_code ?? "");
  const [notes, setNotes] = useState(order.notes ?? "");
  const [trackingCode, setTrackingCode] = useState(order.tracking_code ?? "");
  const [trackingUrl, setTrackingUrl] = useState(order.tracking_url ?? "");
  const [carrier, setCarrier] = useState(order.shipping_carrier ?? "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_name: customerName,
          customer_email: customerEmail || null,
          customer_phone: customerPhone,
          shipping_address: address,
          shipping_city: city,
          shipping_county: county || null,
          shipping_postal_code: postal || null,
          notes: notes || null,
          tracking_code: trackingCode || null,
          tracking_url: trackingUrl || null,
          shipping_carrier: carrier || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Opslaan mislukt");
      } else {
        router.refresh();
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function sendcloud() {
    setBusy(true);
    setError("");
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
    if (!confirm("Volledige terugbetaling via Mollie uitvoeren en de order annuleren?")) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.id}/refund`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "Terugbetaling mislukt");
      else router.refresh();
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  return (
    <div className="admin-panel admin-stack-tight">
      <h2 className="admin-h2 admin-m-0">Bestelling bewerken &amp; verzending</h2>
      {error ? <div className="admin-error-box">{error}</div> : null}
      <div className="admin-form-grid">
        <label className="admin-label">
          Naam
          <input className="admin-field" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
        </label>
        <label className="admin-label">
          E-mail
          <input className="admin-field" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
        </label>
        <label className="admin-label">
          Telefoon
          <input className="admin-field" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </label>
        <label className="admin-label admin-span-2">
          Adres
          <input className="admin-field" value={address} onChange={(e) => setAddress(e.target.value)} />
        </label>
        <label className="admin-label">
          Postcode
          <input className="admin-field" value={postal} onChange={(e) => setPostal(e.target.value)} />
        </label>
        <label className="admin-label">
          Plaats
          <input className="admin-field" value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label className="admin-label">
          Provincie / land
          <input className="admin-field" value={county} onChange={(e) => setCounty(e.target.value)} />
        </label>
        <label className="admin-label admin-span-2">
          Opmerkingen
          <textarea className="admin-field" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </label>
        <label className="admin-label">
          Vervoerder
          <input className="admin-field" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
        </label>
        <label className="admin-label">
          Trackingcode
          <input className="admin-field" value={trackingCode} onChange={(e) => setTrackingCode(e.target.value)} />
        </label>
        <label className="admin-label admin-span-2">
          Tracking-URL
          <input className="admin-field" value={trackingUrl} onChange={(e) => setTrackingUrl(e.target.value)} />
        </label>
      </div>
      <div className="admin-tools-row">
        <button type="button" className="admin-btn-primary" disabled={busy} onClick={() => void save()}>
          Gegevens opslaan
        </button>
        <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => void sendcloud()}>
          Sendcloud: label &amp; verzenden
        </button>
        <a className="admin-btn-secondary" href={`/admin/orders/${order.id}/invoice`} target="_blank" rel="noreferrer">
          Factuur
        </a>
        {order.mollie_payment_id && !order.refunded_at ? (
          <button type="button" className="admin-btn-danger" disabled={busy} onClick={() => void refund()}>
            Terugbetaling
          </button>
        ) : null}
      </div>
      {order.sendcloud_label_url ? (
        <a href={order.sendcloud_label_url} target="_blank" rel="noreferrer" className="admin-link-action">
          Verzendlabel openen
        </a>
      ) : null}
      {order.refunded_at ? (
        <p className="admin-muted admin-m-0">
          Terugbetaald op {new Date(order.refunded_at).toLocaleString("nl-NL")}
          {order.refund_amount != null ? ` · ${order.refund_amount}` : ""}
        </p>
      ) : null}
    </div>
  );
}
