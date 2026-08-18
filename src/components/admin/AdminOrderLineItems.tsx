"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import AdminMoneyInput from "@/components/admin/AdminMoneyInput";
import AdminProductTypeahead from "@/components/admin/AdminProductTypeahead";
import type { AdminProductSearchHit, OrderLineCatalogInfo } from "@/lib/admin-product-search-types";
import { formatMoneyInput } from "@/lib/money-input";
import type { OrderItemRow } from "@/lib/orders";
import { formatProductPrice } from "@/lib/products";

type LineKind = "product" | "unlinked" | "custom";

type DraftItem = {
  key: string;
  id?: number;
  kind: LineKind;
  name: string;
  quantity: string;
  unit_price: string;
  product_id: number | null;
  variation_label: string;
  image: string | null;
  sku: string | null;
};

function toDraft(item: OrderItemRow, catalog?: OrderLineCatalogInfo): DraftItem {
  return {
    key: `existing-${item.id}`,
    id: item.id,
    kind: item.product_id ? "product" : "unlinked",
    name: item.name,
    quantity: String(item.quantity),
    unit_price: formatMoneyInput(item.unit_price),
    product_id: item.product_id,
    variation_label: item.variation_label ?? "",
    image: item.image || catalog?.image || null,
    sku: catalog?.sku ?? null,
  };
}

function customRow(): DraftItem {
  return {
    key: `custom-${Date.now()}`,
    kind: "custom",
    name: "",
    quantity: "1",
    unit_price: "0.00",
    product_id: null,
    variation_label: "",
    image: null,
    sku: null,
  };
}

function fromHit(hit: AdminProductSearchHit): DraftItem {
  return {
    key: `new-${hit.id}-${Date.now()}`,
    kind: "product",
    name: hit.name,
    quantity: "1",
    unit_price: formatMoneyInput(hit.price),
    product_id: hit.id,
    variation_label: "",
    image: hit.image,
    sku: hit.sku,
  };
}

function lineTotal(row: DraftItem) {
  const qty = Number(row.quantity);
  const price = Number(row.unit_price);
  if (!Number.isFinite(qty) || !Number.isFinite(price)) return 0;
  return qty * price;
}

export default function AdminOrderLineItems({
  orderId,
  currency,
  items,
  catalogById,
  discountTotal,
  shippingTotal,
  shippingLabel,
  couponCode,
}: {
  orderId: number;
  currency: string;
  items: OrderItemRow[];
  catalogById: Record<number, OrderLineCatalogInfo>;
  discountTotal: number;
  shippingTotal: number;
  shippingLabel: string | null;
  couponCode: string | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<DraftItem[]>(() =>
    items.map((item) => toDraft(item, item.product_id ? catalogById[item.product_id] : undefined)),
  );
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const previewSubtotal = useMemo(
    () => rows.reduce((sum, row) => sum + lineTotal(row), 0),
    [rows],
  );
  const previewGrand = Math.round((previewSubtotal - discountTotal + shippingTotal) * 100) / 100;

  function updateRow(key: string, patch: Partial<DraftItem>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  }

  function addProduct(hit: AdminProductSearchHit) {
    setRows((prev) => [...prev, fromHit(hit)]);
  }

  function linkProduct(key: string, hit: AdminProductSearchHit) {
    setRows((prev) =>
      prev.map((row) =>
        row.key === key
          ? {
              ...row,
              kind: "product",
              product_id: hit.id,
              image: row.image || hit.image,
              sku: hit.sku,
            }
          : row,
      ),
    );
  }

  function cancelEdit() {
    setRows(items.map((item) => toDraft(item, item.product_id ? catalogById[item.product_id] : undefined)));
    setEditing(false);
    setError("");
  }

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: rows.map((row) => ({
            id: row.id,
            name: row.name,
            quantity: Number(row.quantity),
            unit_price: Number(row.unit_price),
            product_id: row.product_id,
            variation_label: row.variation_label || null,
          })),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Regels opslaan mislukt");
      } else {
        setEditing(false);
        router.refresh();
      }
    } catch {
      setError("Geen verbinding");
    }
    setBusy(false);
  }

  return (
    <div className="admin-stack-tight">
      {editing ? (
        <div className="admin-list-toolbar">
          <AdminProductTypeahead
            placeholder="Zoek op naam of SKU…"
            disabled={busy}
            currency={currency}
            onPick={addProduct}
          />
          <button
            type="button"
            className="admin-btn-secondary"
            disabled={busy}
            onClick={() => setRows((prev) => [...prev, customRow()])}
          >
            Aangepaste regel
          </button>
          <button type="button" className="admin-link-action" disabled={busy} onClick={cancelEdit}>
            Annuleren
          </button>
          <button type="button" className="admin-btn-secondary" disabled={busy} onClick={() => void save()}>
            {busy ? "Opslaan…" : "Opslaan"}
          </button>
        </div>
      ) : (
        <div className="admin-page-head">
          <h2 className="admin-h2 admin-m-0">Producten</h2>
          <button type="button" className="admin-link-action" onClick={() => setEditing(true)}>
            Regels bewerken
          </button>
        </div>
      )}

      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className={`admin-panel admin-table-wrap admin-products-table${editing ? " admin-table-wrap--suggest" : ""}`}>
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col" className="admin-th-thumb">
                <span className="admin-sr-only">Foto</span>
              </th>
              <th scope="col">Naam</th>
              <th scope="col">SKU</th>
              <th className="admin-td-right" scope="col">
                Aantal
              </th>
              <th className="admin-td-right" scope="col">
                Prijs
              </th>
              <th className="admin-td-right" scope="col">
                Totaal
              </th>
              {editing ? <th scope="col" aria-label="Acties" /> : null}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const line = lineTotal(row);
              const qty = Number(row.quantity);
              const price = Number(row.unit_price);
              const nameLabel = row.name || "Naamloos product";
              const nameNode =
                row.product_id != null ? (
                  <Link
                    href={`/admin/products/${row.product_id}`}
                    className="admin-table-product-name"
                    {...(editing ? { target: "_blank", rel: "noreferrer" } : {})}
                  >
                    {nameLabel}
                  </Link>
                ) : editing && row.kind === "custom" ? null : (
                  <span className="admin-table-product-name">{nameLabel}</span>
                );

              return (
                <tr key={row.key}>
                  <td className="admin-thumb-cell">
                    <div className="admin-thumb-wrap">
                      {row.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.image} alt="" className="admin-thumb" loading="lazy" decoding="async" />
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <div className="admin-table-product">
                      {editing && row.kind === "custom" ? (
                        <input
                          className="admin-field admin-field--flush"
                          value={row.name}
                          onChange={(e) => updateRow(row.key, { name: e.target.value })}
                          aria-label="Omschrijving"
                          placeholder="Bijv. montagekosten"
                        />
                      ) : (
                        nameNode
                      )}
                      {row.kind === "unlinked" ? <span className="admin-badge-concept">Niet gekoppeld</span> : null}
                      {row.kind === "custom" ? <span className="admin-badge-concept">Aangepast</span> : null}
                      {row.variation_label || (editing && row.kind === "product") ? (
                        editing ? (
                          <input
                            className="admin-field admin-field--flush"
                            value={row.variation_label}
                            onChange={(e) => updateRow(row.key, { variation_label: e.target.value })}
                            aria-label="Variant"
                            placeholder="Variant (optioneel)"
                          />
                        ) : (
                          <span className="admin-muted">{row.variation_label}</span>
                        )
                      ) : null}
                      {editing && row.kind === "unlinked" ? (
                        <AdminProductTypeahead
                          placeholder="Koppel product…"
                          disabled={busy}
                          currency={currency}
                          onPick={(hit) => linkProduct(row.key, hit)}
                        />
                      ) : null}
                    </div>
                  </td>
                  <td className="admin-td-mono">{row.sku || "—"}</td>
                  <td className="admin-td-right">
                    {editing ? (
                      <input
                        className="admin-field admin-field--flush admin-table-num"
                        type="number"
                        min={1}
                        step={1}
                        value={row.quantity}
                        onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                        aria-label="Aantal"
                      />
                    ) : (
                      <span className="admin-td-mono">{Number.isFinite(qty) ? qty : row.quantity}</span>
                    )}
                  </td>
                  <td className="admin-td-right">
                    {editing ? (
                      <AdminMoneyInput
                        className="admin-field admin-field--flush admin-table-num"
                        value={row.unit_price}
                        onChange={(unit_price) => updateRow(row.key, { unit_price })}
                        aria-label="Stukprijs"
                      />
                    ) : (
                      <span className="admin-td-mono">
                        {formatProductPrice(Number.isFinite(price) ? price : 0, currency)}
                      </span>
                    )}
                  </td>
                  <td className="admin-td-right admin-td-mono">{formatProductPrice(line, currency)}</td>
                  {editing ? (
                    <td className="admin-td-right">
                      <button
                        type="button"
                        className="admin-link-action"
                        disabled={busy || rows.length <= 1}
                        onClick={() => setRows((prev) => prev.filter((item) => item.key !== row.key))}
                      >
                        Weg
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} />
              <td className="admin-td-right">Subtotaal</td>
              <td className="admin-td-right admin-td-mono">{formatProductPrice(previewSubtotal, currency)}</td>
              {editing ? <td /> : null}
            </tr>
            {discountTotal > 0.005 ? (
              <tr>
                <td colSpan={4} />
                <td className="admin-td-right">Korting{couponCode ? ` · ${couponCode}` : ""}</td>
                <td className="admin-td-right admin-td-mono">−{formatProductPrice(discountTotal, currency)}</td>
                {editing ? <td /> : null}
              </tr>
            ) : null}
            <tr>
              <td colSpan={4} />
              <td className="admin-td-right">Verzending{shippingLabel ? ` · ${shippingLabel}` : ""}</td>
              <td className="admin-td-right admin-td-mono">
                {shippingTotal > 0.004 ? formatProductPrice(shippingTotal, currency) : "Gratis"}
              </td>
              {editing ? <td /> : null}
            </tr>
            <tr className="admin-table-total">
              <td colSpan={4} />
              <td className="admin-td-right">Te betalen</td>
              <td className="admin-td-right admin-td-mono">{formatProductPrice(previewGrand, currency)}</td>
              {editing ? <td /> : null}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
