"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const adminFetchInit: RequestInit = { credentials: "include", cache: "no-store" };

export default function AdminWooCommerceOrdersSyncButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runSync(mode: "recent" | "all") {
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/orders/sync-woocommerce", {
        method: "POST",
        ...adminFetchInit,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "recent" ? { recentDays: 90 } : { maxPages: 50 }),
      });
      const data = (await res.json()) as {
        error?: string;
        fetched?: number;
        created?: number;
        updated?: number;
        totalRemote?: number;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setMessage(
        `Gesynchroniseerd: ${data.fetched ?? 0} opgehaald (${data.created ?? 0} nieuw, ${data.updated ?? 0} bijgewerkt)` +
          (data.totalRemote != null ? ` · ${data.totalRemote} op WooCommerce` : ""),
      );
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Netwerkfout");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-stack-tight">
      <div className="admin-tools-row">
        <button
          type="button"
          className="admin-btn-primary"
          disabled={loading}
          onClick={() => void runSync("recent")}
        >
          {loading ? "Bezig…" : "Sync WC (90 dagen)"}
        </button>
        <button
          type="button"
          className="admin-btn-secondary"
          disabled={loading}
          onClick={() => void runSync("all")}
        >
          Sync alle WC-orders
        </button>
      </div>
      {message ? <p className="admin-muted admin-m-0">{message}</p> : null}
      {error ? (
        <p className="admin-m-0" style={{ color: "#b91c1c", fontSize: "0.85rem" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
