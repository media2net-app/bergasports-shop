"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ORDER_STATUSES, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/orders";

export default function AdminOrderStatusSelect({
  orderId,
  currentStatus,
}: {
  orderId: number;
  currentStatus: OrderStatus;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleChange(next: string) {
    const value = next as OrderStatus;
    setStatus(value);
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setStatus(currentStatus);
        setError(data.error ?? "Status bijwerken mislukt");
      } else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setStatus(currentStatus);
      setError("Geen verbinding");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="admin-order-text-btn" onClick={() => setOpen(true)}>
        Andere status
      </button>
    );
  }

  return (
    <div className="admin-order-status-edit">
      <select
        className="admin-order-select"
        value={status}
        disabled={loading}
        aria-label="Status wijzigen"
        onChange={(e) => handleChange(e.target.value)}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <button type="button" className="admin-order-text-btn" disabled={loading} onClick={() => setOpen(false)}>
        Sluiten
      </button>
      {error ? <p className="admin-order-inline-error">{error}</p> : null}
    </div>
  );
}
