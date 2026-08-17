"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { stockStateLabel, type StockState } from "@/lib/stock";

export type AdminProductListRow = {
  id: number;
  catalogLabel: string;
  displayName: string;
  category: string;
  priceLabel: string;
  stockLabel: string;
  stockState: StockState;
  thumbUrl: string;
  featuredOnHomepage?: boolean;
  productStatus?: "published" | "concept";
};

const STOCK_STATE_CLASS: Record<StockState, string> = {
  in_stock: "admin-badge-stock admin-badge-stock--in",
  low_stock: "admin-badge-stock admin-badge-stock--low",
  out_of_stock: "admin-badge-stock admin-badge-stock--out",
  unmanaged: "admin-badge-stock",
};

type Props = {
  rows: AdminProductListRow[];
  exportHref: string;
  canWrite: boolean;
};

export default function AdminProductsInteractiveList({ rows, exportHref, canWrite }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(() => new Set());
  const [busy, setBusy] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const headRef = useRef<HTMLInputElement>(null);

  const rowIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected = rowIds.length > 0 && rowIds.every((id) => selected.has(id));
  const someSelected = rowIds.some((id) => selected.has(id));

  useEffect(() => {
    const el = headRef.current;
    if (el) {
      el.indeterminate = someSelected && !allSelected;
    }
  }, [someSelected, allSelected]);

  const toggleRow = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      if (rowIds.length === 0) {
        return new Set();
      }
      const all = rowIds.every((id) => prev.has(id));
      return all ? new Set() : new Set(rowIds);
    });
  }, [rowIds]);

  const bulkDelete = useCallback(async () => {
    const ids = [...selected];
    if (!ids.length || !canWrite) {
      return;
    }
    if (
      !window.confirm(
        `${ids.length} product(en) definitief verwijderen uit de catalogus? Dit kan niet ongedaan worden gemaakt.`,
      )
    ) {
      return;
    }
    setBulkError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data = (await res.json()) as { error?: string; removed?: number };
      if (!res.ok) {
        setBulkError(data.error ?? "Verwijderen mislukt");
        setBusy(false);
        return;
      }
      setSelected(new Set());
      router.refresh();
    } catch {
      setBulkError("Geen verbinding met de server");
    }
    setBusy(false);
  }, [canWrite, selected, router]);

  return (
    <div className="admin-stack-tight">
      <div className="admin-bulk-toolbar">
        <div className="admin-bulk-toolbar-actions">
          <button
            type="button"
            className="admin-btn-danger"
            disabled={!canWrite || selected.size === 0 || busy}
            title={!canWrite ? "Alleen beschikbaar met schrijfrechten op de database" : undefined}
            onClick={() => void bulkDelete()}
          >
            {busy ? "Bezig…" : `Verwijder selectie (${selected.size})`}
          </button>
          <a href={exportHref} className="admin-btn-secondary" download>
            Download deze pagina (JSON)
          </a>
        </div>
        {!canWrite ? (
          <p className="admin-muted admin-m-0 admin-bulk-toolbar-hint">
            Verwijderen werkt alleen met schrijfrechten op de database.
          </p>
        ) : null}
      </div>
      {bulkError ? <p className="admin-error-box admin-m-0">{bulkError}</p> : null}

      <div className="admin-table-desktop-wrap">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col" className="admin-th-checkbox">
                  <input
                    ref={headRef}
                    type="checkbox"
                    className="admin-checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Alles op deze pagina selecteren"
                  />
                </th>
                <th scope="col">Foto</th>
                <th scope="col">ID</th>
                <th scope="col">Catalogus</th>
                <th scope="col">Naam</th>
                <th scope="col">Prijs</th>
                <th scope="col">Voorraad</th>
                <th scope="col">Categorie</th>
                <th className="admin-td-right" scope="col" aria-label="Acties" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className="admin-table-row-click"
                  onClick={() => router.push(`/admin/products/${p.id}`)}
                  title="Klik om te bewerken"
                >
                  <td className="admin-td-checkbox" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleRow(p.id)}
                      aria-label={`Product ${p.id} selecteren`}
                    />
                  </td>
                  <td className="admin-thumb-cell">
                    <div className="admin-thumb-wrap">
                      {p.thumbUrl ? (
                        <img src={p.thumbUrl} alt="" className="admin-thumb" loading="lazy" decoding="async" />
                      ) : null}
                    </div>
                  </td>
                  <td className="admin-td-mono">{p.id}</td>
                  <td>
                    <span className="admin-badge-src">{p.catalogLabel}</span>
                  </td>
                  <td className="admin-td-truncate" title={p.displayName}>
                    {p.displayName}
                    {p.productStatus === "concept" ? (
                      <span className="admin-badge-concept">Concept</span>
                    ) : null}
                    {p.featuredOnHomepage ? (
                      <span className="admin-badge-homepage">Homepage</span>
                    ) : null}
                  </td>
                  <td className="admin-td-mono">{p.priceLabel}</td>
                  <td>
                    <span className={STOCK_STATE_CLASS[p.stockState]} title={stockStateLabel(p.stockState)}>
                      {p.stockLabel === "—" ? stockStateLabel(p.stockState) : p.stockLabel}
                    </span>
                  </td>
                  <td className="admin-td-truncate" title={p.category}>
                    {p.category}
                  </td>
                  <td className="admin-td-right" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/admin/products/${p.id}`}
                      className="admin-link-action"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Bewerken
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-product-cards-mobile" aria-label="Producten (mobiel)">
        {rows.map((p) => (
          <div
            key={p.id}
            className="admin-product-card-row admin-product-card-row--click"
            onClick={(e) => {
              if ((e.target as HTMLElement).closest("input")) {
                return;
              }
              router.push(`/admin/products/${p.id}`);
            }}
            onKeyDown={(e) => {
              if ((e.target as HTMLElement).closest("input")) {
                return;
              }
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                router.push(`/admin/products/${p.id}`);
              }
            }}
            role="button"
            tabIndex={0}
            title="Klik om te bewerken"
          >
            <input
              type="checkbox"
              className="admin-checkbox admin-product-card-check"
              checked={selected.has(p.id)}
              onChange={() => toggleRow(p.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Product ${p.id} selecteren`}
            />
            <div className="admin-product-card">
              <div className="admin-thumb-wrap">
                {p.thumbUrl ? (
                  <img src={p.thumbUrl} alt="" className="admin-thumb" loading="lazy" decoding="async" />
                ) : null}
              </div>
              <div className="min-w-0">
                <div className="admin-product-card-title">
                  {p.displayName}
                  {p.productStatus === "concept" ? (
                    <span className="admin-badge-concept">Concept</span>
                  ) : null}
                </div>
                <div className="admin-product-card-meta">
                  {p.catalogLabel}
                  {p.category ? ` · ${p.category}` : ""} · {p.priceLabel} ·{" "}
                  {p.stockLabel === "—" ? stockStateLabel(p.stockState) : `${p.stockLabel} op voorraad`}
                </div>
              </div>
              <span className="admin-link-action">→</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
