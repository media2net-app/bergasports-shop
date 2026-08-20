"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";

import type { AdminCustomerKindFilter } from "@/lib/admin-customer-types";
import { buildAdminCustomersQueryString } from "@/lib/admin-customers-list";

type Props = {
  q: string;
  kind: AdminCustomerKindFilter;
  city: string;
  cities: string[];
  hasFilters: boolean;
};

export default function AdminCustomersListToolbar({ q, kind, city, cities, hasFilters }: Props) {
  const router = useRouter();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextQ = String(data.get("q") ?? "").trim();
    const nextCity = String(data.get("city") ?? "").trim();
    const qs = buildAdminCustomersQueryString({
      q: nextQ,
      kind,
      city: nextCity,
    });
    router.push(qs ? `/admin/customers?${qs}` : "/admin/customers");
  }

  return (
    <form
      key={`${q}|${kind}|${city}`}
      method="GET"
      action="/admin/customers"
      className="admin-list-toolbar"
      onSubmit={submit}
      onChange={(event) => {
        const target = event.target as HTMLElement;
        if (target.tagName === "SELECT") {
          event.currentTarget.requestSubmit();
        }
      }}
    >
      {kind !== "all" ? <input type="hidden" name="kind" value={kind} /> : null}
      <input
        className="admin-search-input"
        type="search"
        name="q"
        defaultValue={q}
        placeholder="Zoek op naam, e-mail of telefoon…"
        autoComplete="off"
        aria-label="Klanten zoeken"
      />
      {cities.length > 0 ? (
        <select
          className="admin-field admin-field--flush admin-toolbar-select"
          name="city"
          defaultValue={city}
          aria-label="Plaats"
        >
          <option value="">Alle plaatsen</option>
          {cities.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      ) : null}
      <button type="submit" className="admin-btn-secondary">
        Zoeken
      </button>
      {hasFilters ? (
        <Link href="/admin/customers" className="admin-link-action">
          Wis
        </Link>
      ) : null}
    </form>
  );
}
