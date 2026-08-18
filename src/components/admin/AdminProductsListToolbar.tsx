"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import type { AdminProductStatusFilter, AdminProductStockFilter } from "@/lib/admin-products-list";

type Props = {
  q: string;
  category: string;
  stock: AdminProductStockFilter;
  status: AdminProductStatusFilter;
  categories: string[];
  clearHref: string;
  hasFilters: boolean;
};

export default function AdminProductsListToolbar({
  q,
  category,
  stock,
  status,
  categories,
  clearHref,
  hasFilters,
}: Props) {
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      const trimmed = String(value).trim();
      if (trimmed && trimmed !== "all") {
        params.set(key, trimmed);
      }
    }
    const qs = params.toString();
    router.push(qs ? `/admin/products?${qs}` : "/admin/products");
  }

  return (
    <form
      key={`${q}|${category}|${stock}|${status}`}
      method="GET"
      action="/admin/products"
      className="admin-list-toolbar"
      onSubmit={submit}
      onChange={(event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === "SELECT") {
          event.currentTarget.requestSubmit();
        }
      }}
    >
      <input
        className="admin-search-input"
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Zoek op naam, SKU, categorie of merk…"
        autoComplete="off"
        aria-label="Producten zoeken"
      />
      <select
        className="admin-field admin-field--flush admin-toolbar-select"
        name="category"
        defaultValue={category}
        aria-label="Categorie"
      >
        <option value="">Alle categorieën</option>
        {categories.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>
      <select
        className="admin-field admin-field--flush admin-toolbar-select"
        name="stock"
        defaultValue={stock === "all" ? "" : stock}
        aria-label="Voorraad"
      >
        <option value="">Alle voorraad</option>
        <option value="in_stock">Op voorraad</option>
        <option value="low_stock">Bijna uitverkocht</option>
        <option value="out_of_stock">Uitverkocht</option>
        <option value="unmanaged">Geen aantal</option>
      </select>
      <select
        className="admin-field admin-field--flush admin-toolbar-select"
        name="status"
        defaultValue={status === "all" ? "" : status}
        aria-label="Status"
      >
        <option value="">Alle statussen</option>
        <option value="published">Gepubliceerd</option>
        <option value="concept">Concept</option>
      </select>
      <button type="submit" className="admin-btn-secondary">
        Zoeken
      </button>
      {hasFilters ? (
        <Link href={clearHref} className="admin-link-action">
          Wis
        </Link>
      ) : null}
    </form>
  );
}
