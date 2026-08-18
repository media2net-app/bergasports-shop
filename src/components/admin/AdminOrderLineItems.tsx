"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import AdminProductTypeahead from "@/components/admin/AdminProductTypeahead";
import type { AdminProductSearchHit, OrderLineCatalogInfo } from "@/lib/admin-product-search-types";
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
    unit_price: String(item.unit_price),
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
    unit_price: "0",
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
    unit_price: String(hit.price),
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

function bumpQty(value: string, delta: number) {
  const current = Number.parseInt(value, 10);
  const next = (Number.isFinite(current) ? current : 1) + delta;
  return String(Math.max(1, next));
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
    <section className="admin-order-sheet">
      <div className="admin-order-sheet-head">
        <p className="admin-order-label">Producten</p>
        {editing ? (
          <div className="admin-order-sheet-actions">
            <button type="button" className="admin-order-text-btn" disabled={busy} onClick={cancelEdit}>
              Annuleren
            </button>
            <button type="button" className="admin-btn-primary" disabled={busy} onClick={() => void save()}>
              {busy ? "Opslaan…" : "Opslaan"}
            </button>
          </div>
        ) : (
          <button type="button" className="admin-order-text-btn" onClick={() => setEditing(true)}>
            Regels bewerken
          </button>
        )}
      </div>

      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className="admin-order-lines">
        {rows.map((row) => {
          const line = lineTotal(row);
          const qty = Number(row.quantity);
          const price = Number(row.unit_price);
          const nameLabel = row.name || "Naamloos product";
          const nameNode =
            row.product_id != null ? (
              <Link
                href={`/admin/products/${row.product_id}`}
                className="admin-order-line-name"
                {...(editing ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {nameLabel}
              </Link>
            ) : (
              <span className="admin-order-line-name">{nameLabel}</span>
            );

          if (editing) {
            return (
              <div key={row.key} className="admin-order-line admin-order-line--edit">
                <div className="admin-order-thumb">
                  {row.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.image} alt="" loading="lazy" decoding="async" />
                  ) : null}
                </div>
                <div className="admin-order-line-fields">
                  {row.kind === "custom" ? (
                    <input
                      className="admin-order-input"
                      value={row.name}
                      onChange={(e) => updateRow(row.key, { name: e.target.value })}
                      aria-label="Omschrijving"
                      placeholder="Bijv. montagekosten"
                    />
                  ) : (
                    nameNode
                  )}
                  {row.sku ? <span className="admin-order-line-sku">SKU {row.sku}</span> : null}
                  {row.kind === "unlinked" ? (
                    <span className="admin-order-line-unlinked">Niet gekoppeld</span>
                  ) : null}
                  {row.kind === "custom" ? (
                    <span className="admin-order-line-unlinked">Aangepaste regel</span>
                  ) : null}
                  {row.variation_label ? (
                    <input
                      className="admin-order-input"
                      value={row.variation_label}
                      onChange={(e) => updateRow(row.key, { variation_label: e.target.value })}
                      aria-label="Variant"
                      placeholder="Variant (optioneel)"
                    />
                  ) : null}
                  {row.kind === "unlinked" ? (
                    <AdminProductTypeahead
                      placeholder="Koppel product…"
                      disabled={busy}
                      currency={currency}
                      onPick={(hit) => linkProduct(row.key, hit)}
                    />
                  ) : null}
                </div>
                <div className="admin-order-qty" role="group" aria-label="Aantal">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => updateRow(row.key, { quantity: bumpQty(row.quantity, -1) })}
                    aria-label="Minder"
                  >
                    −
                  </button>
                  <input
                    className="admin-order-qty-input"
                    type="number"
                    min={1}
                    step={1}
                    value={row.quantity}
                    onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                    aria-label="Aantal"
                  />
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => updateRow(row.key, { quantity: bumpQty(row.quantity, 1) })}
                    aria-label="Meer"
                  >
                    +
                  </button>
                </div>
                <input
                  className="admin-order-input admin-order-input--num"
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.unit_price}
                  onChange={(e) => updateRow(row.key, { unit_price: e.target.value })}
                  aria-label="Stukprijs"
                />
                <span className="admin-order-line-money">{formatProductPrice(line, currency)}</span>
                <button
                  type="button"
                  className="admin-order-text-btn admin-order-text-btn--mute"
                  disabled={busy || rows.length <= 1}
                  onClick={() => setRows((prev) => prev.filter((item) => item.key !== row.key))}
                >
                  Weg
                </button>
              </div>
            );
          }

          return (
            <div key={row.key} className="admin-order-line">
              <div className="admin-order-thumb">
                {row.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.image} alt="" loading="lazy" decoding="async" />
                ) : null}
              </div>
              <div className="admin-order-line-copy">
                {nameNode}
                {row.sku ? <span className="admin-order-line-sku">SKU {row.sku}</span> : null}
                {row.product_id == null ? <span className="admin-order-line-unlinked">Niet gekoppeld</span> : null}
                {row.variation_label ? <span className="admin-order-line-variant">{row.variation_label}</span> : null}
              </div>
              <span className="admin-order-line-qty">{Number.isFinite(qty) ? qty : row.quantity} ×</span>
              <span className="admin-order-line-unit">
                {formatProductPrice(Number.isFinite(price) ? price : 0, currency)}
              </span>
              <span className="admin-order-line-money">{formatProductPrice(line, currency)}</span>
            </div>
          );
        })}
      </div>

      {editing ? (
        <div className="admin-order-add">
          <p className="admin-order-add-label">Product toevoegen</p>
          <AdminProductTypeahead
            placeholder="Zoek op naam of SKU…"
            disabled={busy}
            currency={currency}
            onPick={addProduct}
          />
          <button
            type="button"
            className="admin-order-text-btn admin-order-text-btn--mute"
            disabled={busy}
            onClick={() => setRows((prev) => [...prev, customRow()])}
          >
            Aangepaste regel
          </button>
        </div>
      ) : null}

      <div className="admin-order-totals">
        <div className="admin-order-totals-row">
          <span>Subtotaal</span>
          <span>{formatProductPrice(previewSubtotal, currency)}</span>
        </div>
        <div className="admin-order-totals-row">
          <span>Verzending{shippingLabel ? ` · ${shippingLabel}` : ""}</span>
          <span>{shippingTotal > 0.004 ? formatProductPrice(shippingTotal, currency) : "Gratis"}</span>
        </div>
        {discountTotal > 0.005 ? (
          <div className="admin-order-totals-row">
            <span>Korting{couponCode ? ` · ${couponCode}` : ""}</span>
            <span>−{formatProductPrice(discountTotal, currency)}</span>
          </div>
        ) : null}
        <div className="admin-order-totals-row admin-order-totals-row--grand">
          <span>Totaal</span>
          <span>{formatProductPrice(previewGrand, currency)}</span>
        </div>
      </div>
    </section>
  );
}
