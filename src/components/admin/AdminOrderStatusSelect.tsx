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
        router.refresh();
      }
    } catch {
      setStatus(currentStatus);
      setError("Geen verbinding");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-stack-tight">
      <label htmlFor="order-status" className="admin-label">
        Status
      </label>
      <select
        id="order-status"
        className="admin-field"
        value={status}
        disabled={loading}
        onChange={(e) => handleChange(e.target.value)}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      {error ? <p className="admin-error-box admin-m-0">{error}</p> : null}
    </div>
  );
}
