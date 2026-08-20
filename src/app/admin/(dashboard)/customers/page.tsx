import Link from "next/link";

import AdminClickableTableRow from "@/components/admin/AdminClickableTableRow";
import AdminCustomersListToolbar from "@/components/admin/AdminCustomersListToolbar";
import type { AdminCustomerDirectoryResult, AdminCustomerKindFilter, AdminCustomerListItem } from "@/lib/admin-customer-types";
import { buildAdminCustomersQueryString, parseAdminCustomerKindFilter } from "@/lib/admin-customers-list";
import { listAdminCustomerDirectory } from "@/lib/customers-admin";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

const EMPTY_DIRECTORY: AdminCustomerDirectoryResult = {
  rows: [],
  accounts: [],
  guests: [],
  cities: [],
  counts: { all: 0, account: 0, guest: 0 },
  total: 0,
  totalPages: 1,
  page: 1,
  from: 0,
  to: 0,
};

type PageProps = {
  searchParams?: Promise<{ q?: string; kind?: string; city?: string; page?: string }>;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("nl-NL", { dateStyle: "short" });
}

function guestCreateHref(customer: AdminCustomerListItem) {
  return `/admin/customers/new?${new URLSearchParams({
    ...(customer.email ? { email: customer.email } : {}),
    ...(customer.name ? { name: customer.name } : {}),
    ...(customer.phone ? { phone: customer.phone } : {}),
  }).toString()}`;
}

function rowKey(customer: AdminCustomerListItem) {
  if (customer.id) return customer.id;
  return `guest-${customer.email ?? ""}-${customer.phone ?? ""}-${customer.lastOrderNumber ?? ""}`;
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const qInput = typeof sp.q === "string" ? sp.q : "";
  const qTrim = qInput.trim();
  const kind: AdminCustomerKindFilter = parseAdminCustomerKindFilter(sp.kind);
  const city = typeof sp.city === "string" ? sp.city.trim() : "";
  const requestedPage = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);

  const directory = await listAdminCustomerDirectory({
    q: qTrim || undefined,
    kind,
    city: city || undefined,
    page: requestedPage,
    pageSize: PAGE_SIZE,
  }).catch(() => EMPTY_DIRECTORY);

  const { rows, cities, counts, total, totalPages, page, from, to } = directory;
  const queryBase = { q: qTrim, kind, city };
  const pageLink = (p: number) => {
    const qs = buildAdminCustomersQueryString({ ...queryBase, page: p });
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  };
  const filterHref = (nextKind: AdminCustomerKindFilter) => {
    const qs = buildAdminCustomersQueryString({ ...queryBase, kind: nextKind, page: 1 });
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  };

  const hasFilters = qTrim.length > 0 || kind !== "all" || city.length > 0;
  const emptyTitle = hasFilters ? "Geen resultaten" : "Nog geen klanten";
  const emptyCopy = hasFilters
    ? qTrim
      ? `Niets gevonden voor “${qTrim}”.`
      : "Niets gevonden voor deze filters."
    : "Voeg je eerste klant toe of wacht tot er een gastbestelling binnenkomt.";

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Klanten</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {total} {total === 1 ? "klant" : "klanten"}
            {hasFilters ? " in deze selectie" : ""}
            {qTrim ? ` voor “${qTrim}”` : ""}.
          </p>
        </div>
        <Link href="/admin/customers/new" className="admin-btn-primary">
          Nieuwe klant
        </Link>
      </div>

      <AdminCustomersListToolbar
        q={qInput}
        kind={kind}
        city={city}
        cities={cities}
        hasFilters={hasFilters}
      />

      <div className="admin-pill-row">
        <Link href={filterHref("all")} className={`admin-pill${kind === "all" ? " active" : ""}`}>
          Alles
          <span className="admin-pill-count">{counts.all.toLocaleString("nl-NL")}</span>
        </Link>
        <Link href={filterHref("account")} className={`admin-pill${kind === "account" ? " active" : ""}`}>
          Account
          <span className="admin-pill-count">{counts.account.toLocaleString("nl-NL")}</span>
        </Link>
        <Link href={filterHref("guest")} className={`admin-pill${kind === "guest" ? " active" : ""}`}>
          Gast
          <span className="admin-pill-count">{counts.guest.toLocaleString("nl-NL")}</span>
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="admin-panel admin-empty">
          <p className="admin-empty-title">{emptyTitle}</p>
          <p className="admin-muted admin-m-0">{emptyCopy}</p>
          {hasFilters ? (
            <Link href="/admin/customers" className="admin-link-action admin-mt-1">
              Alle klanten
            </Link>
          ) : (
            <Link href="/admin/customers/new" className="admin-btn-primary admin-mt-1">
              Nieuwe klant
            </Link>
          )}
        </div>
      ) : (
        <div className="admin-panel admin-table-wrap admin-customers-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Naam</th>
                <th>E-mail</th>
                <th>Telefoon</th>
                <th>Plaats</th>
                <th>Bestellingen</th>
                <th>Type</th>
                <th>Datum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((customer) => {
                const href = customer.id ? `/admin/customers/${customer.id}` : guestCreateHref(customer);
                const actionLabel = customer.kind === "account" ? "Bewerken" : "Account aanmaken";
                return (
                  <AdminClickableTableRow
                    key={rowKey(customer)}
                    href={href}
                    title={customer.kind === "account" ? "Klik om te bewerken" : "Klik om een account aan te maken"}
                  >
                    <td>
                      <div className="admin-table-customer">
                        {customer.kind === "account" ? (
                          <Link href={href} className="admin-table-customer-name">
                            <span className="admin-td-truncate">{customer.name}</span>
                          </Link>
                        ) : (
                          <span className="admin-table-customer-name">
                            <span className="admin-td-truncate">{customer.name}</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="admin-td-truncate">
                      {customer.email ? (
                        <a href={`mailto:${customer.email}`} className="admin-link-action">
                          {customer.email}
                        </a>
                      ) : (
                        <span className="admin-muted">—</span>
                      )}
                    </td>
                    <td className="admin-muted">{customer.phone || "—"}</td>
                    <td>{customer.city || <span className="admin-muted">—</span>}</td>
                    <td>
                      <div className="admin-status-stack">
                        <span>{customer.orderCount.toLocaleString("nl-NL")}</span>
                        {customer.lastOrderId && customer.lastOrderNumber ? (
                          <Link href={`/admin/orders/${customer.lastOrderId}`} className="admin-link-action">
                            {customer.lastOrderNumber}
                          </Link>
                        ) : (
                          <span className="admin-muted">geen</span>
                        )}
                      </div>
                    </td>
                    <td>
                      {customer.kind === "account" ? (
                        <span className="admin-badge-published">Account</span>
                      ) : (
                        <span className="admin-badge-concept">Gast</span>
                      )}
                    </td>
                    <td>
                      <div className="admin-table-date">
                        <span>{formatDate(customer.createdAt)}</span>
                        {customer.kind === "account" && customer.lastOrderAt ? (
                          <span className="admin-muted">laatst {formatDate(customer.lastOrderAt)}</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="admin-td-right">
                      <Link href={href} className="admin-link-action">
                        {actionLabel}
                      </Link>
                    </td>
                  </AdminClickableTableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 ? (
        <div className="admin-pagination" role="navigation" aria-label="Paginering">
          <p className="admin-pagination-meta admin-m-0">
            <strong>{from}</strong>–<strong>{to}</strong> van <strong>{total}</strong>
          </p>
          {totalPages > 1 ? (
            <div className="admin-pagination-nav">
              {page <= 1 ? (
                <span className="admin-pagination-link is-disabled" aria-disabled="true">
                  Vorige
                </span>
              ) : (
                <Link href={pageLink(page - 1)} className="admin-pagination-link">
                  Vorige
                </Link>
              )}
              <span className="admin-pagination-pages">
                Pagina <strong>{page}</strong> / {totalPages}
              </span>
              {page >= totalPages ? (
                <span className="admin-pagination-link is-disabled" aria-disabled="true">
                  Volgende
                </span>
              ) : (
                <Link href={pageLink(page + 1)} className="admin-pagination-link">
                  Volgende
                </Link>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
