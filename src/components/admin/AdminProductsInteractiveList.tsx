"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type AdminProductListRow = {
  id: number;
  catalogLabel: string;
  displayName: string;
  category: string;
  priceLabel: string;
  stockLabel: string;
  thumbUrl: string;
  featuredOnHomepage?: boolean;
  productStatus?: "published" | "concept";
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
        `Permanently delete ${ids.length} product(s) from the catalog? This cannot be undone without a backup.`,
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
        setBulkError(data.error ?? "Delete failed");
        setBusy(false);
        return;
      }
      setSelected(new Set());
      router.refresh();
    } catch {
      setBulkError("Network error");
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
            title={!canWrite ? "Only available with local write access" : undefined}
            onClick={() => void bulkDelete()}
          >
            {busy ? "Working…" : `Delete selected (${selected.size})`}
          </button>
          <a href={exportHref} className="admin-btn-secondary" download>
            Download this page (JSON)
          </a>
        </div>
        {!canWrite ? (
          <p className="admin-muted admin-m-0 admin-bulk-toolbar-hint">
            Bulk delete only works with database write access (not on read-only deploys).
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
                    aria-label="Select all on this page"
                  />
                </th>
                <th scope="col">Photo</th>
                <th scope="col">ID</th>
                <th scope="col">Catalog</th>
                <th scope="col">Name</th>
                <th scope="col">Price</th>
                <th scope="col">Stock</th>
                <th scope="col">Category</th>
                <th className="admin-td-right" scope="col" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className="admin-table-row-click"
                  onClick={() => router.push(`/admin/products/${p.id}`)}
                  title="Click to edit"
                >
                  <td className="admin-td-checkbox" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggleRow(p.id)}
                      aria-label={`Select product ${p.id}`}
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
                  <td className="admin-td-mono" title={p.stockLabel}>
                    {p.stockLabel}
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
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="admin-product-cards-mobile" aria-label="Products (mobile)">
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
            title="Click to edit"
          >
            <input
              type="checkbox"
              className="admin-checkbox admin-product-card-check"
              checked={selected.has(p.id)}
              onChange={() => toggleRow(p.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select product ${p.id}`}
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
                  {p.category ? ` · ${p.category}` : ""} · {p.priceLabel}
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
