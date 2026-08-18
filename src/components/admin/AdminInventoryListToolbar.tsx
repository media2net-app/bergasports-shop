"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

export type AdminInventoryFilter = "alles" | "laag" | "uitverkocht" | "onbeheerd";

type Props = {
  q: string;
  filter: AdminInventoryFilter;
  hasFilters: boolean;
};

export default function AdminInventoryListToolbar({ q, filter, hasFilters }: Props) {
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) {
      const trimmed = String(value).trim();
      if (trimmed && trimmed !== "alles") {
        params.set(key, trimmed);
      }
    }
    const qs = params.toString();
    router.push(qs ? `/admin/inventory?${qs}` : "/admin/inventory");
  }

  return (
    <form
      key={`${q}|${filter}`}
      method="GET"
      action="/admin/inventory"
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
        placeholder="Zoek op naam, SKU, merk of categorie…"
        autoComplete="off"
        aria-label="Voorraad zoeken"
      />
      <select
        className="admin-field admin-field--flush admin-toolbar-select"
        name="filter"
        defaultValue={filter}
        aria-label="Voorraadfilter"
      >
        <option value="alles">Alle voorraad</option>
        <option value="laag">Laag</option>
        <option value="uitverkocht">Uitverkocht</option>
        <option value="onbeheerd">Geen aantal</option>
      </select>
      <button type="submit" className="admin-btn-secondary">
        Zoeken
      </button>
      {hasFilters ? (
        <Link href="/admin/inventory" className="admin-link-action">
          Wis
        </Link>
      ) : null}
    </form>
  );
}
