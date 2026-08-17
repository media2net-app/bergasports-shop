"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { stockStateLabel, type StockState } from "@/lib/stock";

export type AdminInventoryRow = {
  id: number;
  name: string;
  category: string;
  brand: string;
  stockQuantity: number | null;
  reservedStock: number | null;
  available: number | null;
  state: StockState;
  thumbUrl: string;
  concept: boolean;
};

type Props = {
  rows: AdminInventoryRow[];
  canWrite: boolean;
  lowStockThreshold: number;
};

const STATE_CLASS: Record<StockState, string> = {
  in_stock: "admin-badge-stock admin-badge-stock--in",
  low_stock: "admin-badge-stock admin-badge-stock--low",
  out_of_stock: "admin-badge-stock admin-badge-stock--out",
  unmanaged: "admin-badge-stock",
};

export default function AdminInventoryTable({ rows, canWrite, lowStockThreshold }: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<number | null>(null);

  const draftValue = (row: AdminInventoryRow) =>
    drafts[row.id] ?? (row.stockQuantity == null ? "" : String(row.stockQuantity));

  async function save(row: AdminInventoryRow, patch: { stockQuantity?: number | null; inStock?: boolean }) {
    setBusyId(row.id);
    setError("");
    setSavedId(null);
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: row.id, ...patch }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Opslaan mislukt");
        return;
      }
      setSavedId(row.id);
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      router.refresh();
    } catch {
      setError("Geen verbinding met de server");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="admin-stack-tight">
      {error ? <p className="admin-error-box admin-m-0">{error}</p> : null}
      {!canWrite ? (
        <p className="admin-muted admin-m-0">
          Deze omgeving is alleen-lezen; voorraad aanpassen werkt hier niet.
        </p>
      ) : null}

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Foto</th>
              <th scope="col">Product</th>
              <th scope="col">Aantal</th>
              <th scope="col">Gereserveerd</th>
              <th scope="col">Beschikbaar</th>
              <th scope="col">Status</th>
              <th className="admin-td-right" scope="col" aria-label="Acties" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const busy = busyId === row.id;
              const value = draftValue(row);
              const changed = value !== (row.stockQuantity == null ? "" : String(row.stockQuantity));
              return (
                <tr key={row.id}>
                  <td className="admin-thumb-cell">
                    <div className="admin-thumb-wrap">
                      {row.thumbUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.thumbUrl}
                          alt=""
                          className="admin-thumb"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="admin-td-truncate" title={row.name}>
                    <Link href={`/admin/products/${row.id}`} className="admin-link-action">
                      {row.name}
                    </Link>
                    {row.concept ? <span className="admin-badge-concept">Concept</span> : null}
                    <div className="admin-muted" style={{ fontSize: "0.75rem" }}>
                      {[row.brand, row.category].filter(Boolean).join(" · ") || "—"}
                    </div>
                  </td>
                  <td>
                    <input
                      className="admin-stock-input"
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      value={value}
                      disabled={!canWrite || busy}
                      placeholder="leeg"
                      aria-label={`Voorraad voor ${row.name}`}
                      onChange={(e) =>
                        setDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))
                      }
                    />
                  </td>
                  <td className="admin-td-mono">{row.reservedStock ?? 0}</td>
                  <td className="admin-td-mono">{row.available ?? "—"}</td>
                  <td>
                    <span className={STATE_CLASS[row.state]}>{stockStateLabel(row.state)}</span>
                    {row.state === "low_stock" ? (
                      <div className="admin-muted" style={{ fontSize: "0.72rem" }}>
                        {lowStockThreshold} of minder
                      </div>
                    ) : null}
                  </td>
                  <td className="admin-td-right">
                    <div className="admin-tools-row" style={{ justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="admin-btn-primary"
                        disabled={!canWrite || busy || !changed}
                        onClick={() =>
                          void save(row, {
                            stockQuantity: value.trim() === "" ? null : Number(value),
                          })
                        }
                      >
                        {busy ? "Bezig…" : savedId === row.id ? "Opgeslagen" : "Opslaan"}
                      </button>
                      <button
                        type="button"
                        className="admin-btn-secondary"
                        disabled={!canWrite || busy}
                        onClick={() => void save(row, { inStock: row.state === "out_of_stock" })}
                      >
                        {row.state === "out_of_stock" ? "Op voorraad" : "Uitverkocht"}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
