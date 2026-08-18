"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type KeyboardEvent } from "react";

import type { StockState } from "@/lib/stock";

export type AdminInventoryRow = {
  id: number;
  name: string;
  sku: string;
  category: string;
  brand: string;
  stockQuantity: number | null;
  reservedStock: number | null;
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

function inventoryStateLabel(state: StockState): string {
  switch (state) {
    case "in_stock":
      return "Op voorraad";
    case "low_stock":
      return "Laag";
    case "out_of_stock":
      return "Uitverkocht";
    default:
      return "Geen aantal";
  }
}

function sanitizeQty(raw: string): string {
  return raw.replace(/\D/g, "");
}

function qtyString(value: number | null): string {
  return value == null ? "" : String(value);
}

function StatusPill({ state }: { state: StockState }) {
  return <span className={STATE_CLASS[state]}>{inventoryStateLabel(state)}</span>;
}

function QtyField({
  row,
  value,
  canWrite,
  busy,
  saved,
  onChange,
  onCommit,
  onStep,
}: {
  row: AdminInventoryRow;
  value: string;
  canWrite: boolean;
  busy: boolean;
  saved: boolean;
  onChange: (next: string) => void;
  onCommit: (raw: string) => void;
  onStep: (delta: number) => void;
}) {
  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onCommit(event.currentTarget.value);
      event.currentTarget.blur();
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      onStep(1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      onStep(-1);
    }
  }

  return (
    <div className={`admin-qty-field${saved ? " is-saved" : ""}`}>
      <button
        type="button"
        className="admin-qty-step"
        disabled={!canWrite || busy}
        aria-label={`Een minder van ${row.name}`}
        onClick={() => onStep(-1)}
      >
        −
      </button>
      <input
        className="admin-qty-input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        spellCheck={false}
        value={value}
        disabled={!canWrite || busy}
        placeholder="—"
        aria-label={`Voorraad voor ${row.name}`}
        onChange={(e) => onChange(sanitizeQty(e.target.value))}
        onBlur={(e) => {
          const next = e.relatedTarget as Node | null;
          if (next && e.currentTarget.parentElement?.contains(next)) {
            return;
          }
          onCommit(e.currentTarget.value);
        }}
        onKeyDown={onKeyDown}
      />
      <button
        type="button"
        className="admin-qty-step"
        disabled={!canWrite || busy}
        aria-label={`Een meer van ${row.name}`}
        onClick={() => onStep(1)}
      >
        +
      </button>
    </div>
  );
}

export default function AdminInventoryTable({ rows, canWrite, lowStockThreshold }: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [savedId, setSavedId] = useState<number | null>(null);

  const draftValue = (row: AdminInventoryRow) => drafts[row.id] ?? qtyString(row.stockQuantity);

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

  function commitQty(row: AdminInventoryRow, raw: string) {
    const cleaned = sanitizeQty(raw);
    const next = cleaned === "" ? null : Number(cleaned);
    const original = row.stockQuantity;
    if (next === original || (next == null && original == null)) {
      setDrafts((prev) => {
        const copy = { ...prev };
        delete copy[row.id];
        return copy;
      });
      return;
    }
    void save(row, { stockQuantity: next });
  }

  function stepQty(row: AdminInventoryRow, delta: number) {
    const current = draftValue(row);
    const base = current === "" ? 0 : Number(current);
    const next = Math.max(0, (Number.isFinite(base) ? base : 0) + delta);
    const asString = String(next);
    setDrafts((prev) => ({ ...prev, [row.id]: asString }));
    commitQty(row, asString);
  }

  function rowActions(row: AdminInventoryRow) {
    const busy = busyId === row.id;
    const value = draftValue(row);
    const changed = value !== qtyString(row.stockQuantity);
    const unmanaged = row.stockQuantity == null;
    return (
      <div className="admin-inventory-actions">
        {changed ? (
          <button
            type="button"
            className="admin-link-action"
            disabled={!canWrite || busy}
            onClick={() => commitQty(row, value)}
          >
            {busy ? "Bezig…" : "Opslaan"}
          </button>
        ) : savedId === row.id ? (
          <span className="admin-muted">Opgeslagen</span>
        ) : null}
        {unmanaged ? (
          <button
            type="button"
            className="admin-link-action"
            disabled={!canWrite || busy}
            onClick={() => void save(row, { inStock: row.state === "out_of_stock" })}
          >
            {row.state === "out_of_stock" ? "Op voorraad" : "Uitverkocht"}
          </button>
        ) : null}
        <Link href={`/admin/products/${row.id}`} className="admin-link-action">
          Bewerken
        </Link>
      </div>
    );
  }

  function qtyFieldFor(row: AdminInventoryRow) {
    const value = draftValue(row);
    const changed = value !== qtyString(row.stockQuantity);
    return (
      <QtyField
        row={row}
        value={value}
        canWrite={canWrite}
        busy={busyId === row.id}
        saved={savedId === row.id && !changed}
        onChange={(next) => setDrafts((prev) => ({ ...prev, [row.id]: next }))}
        onCommit={(raw) => commitQty(row, raw)}
        onStep={(delta) => stepQty(row, delta)}
      />
    );
  }

  return (
    <div className="admin-stack-tight">
      {error ? <p className="admin-error-box admin-m-0">{error}</p> : null}
      {!canWrite ? (
        <p className="admin-muted admin-m-0">
          Deze omgeving is alleen-lezen; voorraad aanpassen werkt hier niet.
        </p>
      ) : null}

      <div className="admin-table-desktop-wrap">
        <div className="admin-panel admin-table-wrap admin-inventory-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col" className="admin-th-thumb">
                  <span className="admin-sr-only">Foto</span>
                </th>
                <th scope="col">Naam</th>
                <th scope="col">SKU</th>
                <th scope="col">Aantal</th>
                <th scope="col">Drempel</th>
                <th scope="col">Status</th>
                <th className="admin-td-right" scope="col" aria-label="Acties" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
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
                  <td>
                    <div className="admin-table-product">
                      <span className="admin-table-product-name" title={row.name}>
                        {row.name}
                      </span>
                      {row.concept ? <span className="admin-badge-concept">Concept</span> : null}
                    </div>
                  </td>
                  <td className="admin-td-mono" title={row.sku || undefined}>
                    {row.sku || "—"}
                  </td>
                  <td>
                    {qtyFieldFor(row)}
                    {row.reservedStock ? (
                      <div className="admin-muted admin-inventory-reserved">
                        {row.reservedStock} gereserveerd
                      </div>
                    ) : null}
                  </td>
                  <td className="admin-td-mono">{lowStockThreshold}</td>
                  <td>
                    <StatusPill state={row.state} />
                  </td>
                  <td className="admin-td-right">{rowActions(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-product-cards-mobile" aria-label="Voorraad (mobiel)">
        {rows.map((row) => (
          <div key={row.id} className="admin-product-card admin-inventory-card">
            <div className="admin-thumb-wrap">
              {row.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.thumbUrl} alt="" className="admin-thumb" loading="lazy" decoding="async" />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="admin-product-card-title">{row.name}</div>
              <div className="admin-product-card-meta">
                {[row.sku || null, `drempel ${lowStockThreshold}`].filter(Boolean).join(" · ")}
              </div>
              <div className="admin-inventory-card-controls">
                {qtyFieldFor(row)}
                <StatusPill state={row.state} />
              </div>
              {rowActions(row)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
