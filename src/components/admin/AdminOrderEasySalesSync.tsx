"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  easySalesSyncBadgeClass,
  easySalesSyncLabel,
  type EasySalesSyncStatus,
} from "@/lib/easy-sales-sync-status";

type Props = {
  orderId: number;
  status: EasySalesSyncStatus;
  error: string | null;
  syncedAt: string | null;
};

export default function AdminOrderEasySalesSync({ orderId, status, error, syncedAt }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function retry() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/sync-easy-sales`, { method: "POST" });
      const data = (await res.json()) as { ok?: boolean; error?: string; status?: string };
      if (!res.ok) {
        setMessage(data.error ?? "Sync failed");
      } else if (data.ok) {
        setMessage("Synced to Easy-Sales.");
      } else {
        setMessage(data.error ?? "Sync failed");
      }
      router.refresh();
    } catch {
      setMessage("Network error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-stack admin-stack-tight">
      <div className="admin-flex-between" style={{ alignItems: "center", gap: "0.5rem" }}>
        <span className={easySalesSyncBadgeClass(status)}>{easySalesSyncLabel(status)}</span>
        <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => void retry()}>
          {busy ? "Syncing…" : "Sync to Easy-Sales"}
        </button>
      </div>
      <p className="admin-muted admin-m-0" style={{ fontSize: "0.8125rem" }}>
        Orders in this list come from shop checkout. Easy-Sales receives a copy after each order is placed.
      </p>
      {syncedAt ? (
        <p className="admin-muted admin-m-0" style={{ fontSize: "0.75rem" }}>
          Last attempt: {new Date(syncedAt).toLocaleString("en-US")}
        </p>
      ) : null}
      {error ? (
        <p className="admin-m-0" style={{ fontSize: "0.75rem", color: "var(--admin-danger, #b42318)" }}>
          {error}
        </p>
      ) : null}
      {message ? <p className="admin-muted admin-m-0" style={{ fontSize: "0.75rem" }}>{message}</p> : null}
    </div>
  );
}
