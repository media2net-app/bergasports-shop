"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  PAYMENT_OPS_LABEL,
  PAYMENT_OPS_STATUSES,
  SHIPPING_OPS_LABEL,
  SHIPPING_OPS_STATUSES,
  isPaidPaymentStatus,
  paymentOpsStatus,
  shippingOpsStatus,
  type OrderStatus,
  type PaymentOpsStatus,
  type ShippingOpsStatus,
} from "@/lib/orders";

export default function AdminOrderHeaderStatuses({
  orderId,
  paymentStatus,
  fulfillmentStatus,
}: {
  orderId: number;
  paymentStatus: string | null;
  fulfillmentStatus: OrderStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const paymentValue = paymentOpsStatus(paymentStatus);
  const shippingValue = shippingOpsStatus(fulfillmentStatus);

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Status bijwerken mislukt");
      } else {
        router.refresh();
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  async function onPayment(next: PaymentOpsStatus) {
    if (next === paymentValue) return;
    await patch({ payment_status: next });
  }

  async function onShipping(next: ShippingOpsStatus) {
    if (next === shippingValue) return;
    if (next === "cancelled" && !isPaidPaymentStatus(paymentStatus)) {
      setBusy(true);
      setError("");
      try {
        const res = await fetch(`/api/admin/orders/${orderId}/cancel`, { method: "POST" });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) setError(data.error ?? "Annuleren mislukt");
        else router.refresh();
      } catch {
        setError("Geen verbinding");
      }
      setBusy(false);
      return;
    }
    await patch({ status: next });
  }

  return (
    <div className="admin-order-head-statuses">
      <label className="admin-order-head-status">
        Betaling
        <select
          className="admin-order-select admin-order-select--box"
          value={paymentValue}
          disabled={busy}
          aria-label="Betalingsstatus"
          onChange={(e) => void onPayment(e.target.value as PaymentOpsStatus)}
        >
          {PAYMENT_OPS_STATUSES.map((status) => (
            <option key={status} value={status}>
              {PAYMENT_OPS_LABEL[status]}
            </option>
          ))}
        </select>
      </label>
      <label className="admin-order-head-status">
        Verzending
        <select
          className="admin-order-select admin-order-select--box"
          value={shippingValue}
          disabled={busy}
          aria-label="Verzendstatus"
          onChange={(e) => void onShipping(e.target.value as ShippingOpsStatus)}
        >
          {SHIPPING_OPS_STATUSES.map((status) => (
            <option key={status} value={status}>
              {SHIPPING_OPS_LABEL[status]}
            </option>
          ))}
        </select>
      </label>
      {error ? <p className="admin-order-inline-error">{error}</p> : null}
    </div>
  );
}
