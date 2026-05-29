"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type SyncSummary = {
  ok: boolean;
  easySalesProductCount: number;
  shopProductCount: number;
  matched: number;
  matchedByWebsiteId?: number;
  matchedBySku?: number;
  matchedByName?: number;
  updated: number;
  unchanged: number;
  unmatchedEasySales: number;
  error?: string;
};

export default function EasySalesStockSyncButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function runSync() {
    if (disabled || busy) return;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/admin/inventory/sync-easy-sales", { method: "POST" });
      const data = (await res.json()) as SyncSummary;
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Sync failed.");
        return;
      }
      setMessage(
        `Updated ${data.updated} product(s). Matched ${data.matched}/${data.easySalesProductCount} in Easy Sales` +
          (data.matchedByName != null
            ? ` (${data.matchedByName} by name, ${data.matchedBySku ?? 0} by SKU).`
            : ".") +
          (data.unmatchedEasySales > 0 ? ` ${data.unmatchedEasySales} ES products had no shop match.` : ""),
      );
      router.refresh();
    } catch {
      setError("Could not reach sync API.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-stack-tight">
      <div className="admin-tools-row">
        <button
          type="button"
          className="admin-btn-secondary"
          onClick={() => void runSync()}
          disabled={disabled || busy}
        >
          {busy ? "Syncing stock…" : "Sync stock from Easy Sales"}
        </button>
        <a
          href="/api/admin/inventory/easy-sales-mapping-export"
          className="admin-btn-secondary"
          download
        >
          Export mapping CSV
        </a>
      </div>
      {message ? <p className="admin-muted admin-m-0 admin-text-sm">{message}</p> : null}
      {error ? <p className="admin-error admin-m-0 admin-text-sm">{error}</p> : null}
    </div>
  );
}
