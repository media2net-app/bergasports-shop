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
        setMessage(data.error ?? "Sync mislukt");
      } else if (data.ok) {
        setMessage("Gesynchroniseerd met Easy Sales.");
      } else {
        setMessage(data.error ?? "Sync mislukt");
      }
      router.refresh();
    } catch {
      setMessage("Geen verbinding");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-stack admin-stack-tight">
      <div className="admin-flex-between" style={{ alignItems: "center", gap: "0.5rem" }}>
        <span className={easySalesSyncBadgeClass(status)}>{easySalesSyncLabel(status)}</span>
        <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => void retry()}>
          {busy ? "Bezig…" : "Sync naar Easy Sales"}
        </button>
      </div>
      <p className="admin-muted admin-m-0" style={{ fontSize: "0.8125rem" }}>
        Bestellingen in dit overzicht komen uit de webshop. Easy Sales ontvangt een kopie na elke bestelling.
      </p>
      {syncedAt ? (
        <p className="admin-muted admin-m-0" style={{ fontSize: "0.75rem" }}>
          Laatste poging: {new Date(syncedAt).toLocaleString("nl-NL")}
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
