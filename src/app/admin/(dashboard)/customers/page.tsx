import Link from "next/link";

import { listCustomers } from "@/lib/orders-db";
import { formatProductPrice } from "@/lib/products";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ page?: string; q?: string }>;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const page = Math.max(1, Number.parseInt(String(sp.page ?? "1"), 10) || 1);
  const q = sp.q?.trim() ?? "";

  const { customers, total, totalPages, page: currentPage } = await listCustomers({
    page,
    pageSize: 25,
    search: q || undefined,
  });

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    if (q) {
      params.set("q", q);
    }
    if (p > 1) {
      params.set("page", String(p));
    }
    const qs = params.toString();
    return qs ? `/admin/customers?${qs}` : "/admin/customers";
  };

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Customers</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {total} unique customer{total === 1 ? "" : "s"} from shop orders.
          </p>
        </div>
      </div>

      <div className="admin-panel-surface admin-stack-tight">
        <form method="get" action="/admin/customers" className="admin-tools-row">
          <input
            id="customer-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Name, phone, email, city…"
            className="admin-search-input"
            aria-label="Search customers"
          />
          <button type="submit" className="admin-btn-primary">
            Search
          </button>
          {q ? (
            <Link href="/admin/customers" className="admin-btn-secondary">
              Clear
            </Link>
          ) : null}
        </form>
      </div>

      {customers.length === 0 ? (
        <div className="admin-panel">
          <p className="admin-muted admin-m-0">
            {q ? "No customers match your search." : "No customers yet — they appear after the first order."}
          </p>
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>City</th>
                <th className="admin-td-right">Orders</th>
                <th className="admin-td-right">Total spent</th>
                <th>Last order</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.key} className="admin-table-row-click">
                  <td>
                    <Link href={`/admin/customers/${customer.key}`}>
                      <span className="admin-td-truncate">{customer.name}</span>
                    </Link>
                  </td>
                  <td className="admin-td-mono">
                    <Link href={`/admin/customers/${customer.key}`}>{customer.phone}</Link>
                  </td>
                  <td className="admin-muted">{customer.email ?? "—"}</td>
                  <td>{customer.city ?? "—"}</td>
                  <td className="admin-td-right">{customer.orderCount}</td>
                  <td className="admin-td-right admin-td-mono">
                    {formatProductPrice(customer.totalSpent, customer.currency)}
                  </td>
                  <td className="admin-muted" style={{ fontSize: "0.75rem" }}>
                    <Link href={`/admin/customers/${customer.key}`}>{formatDate(customer.lastOrderAt)}</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 ? (
        <div className="admin-pagination">
          {currentPage > 1 ? (
            <Link href={pageHref(currentPage - 1)} className="admin-pagination-link">
              ← Previous
            </Link>
          ) : (
            <span className="admin-pagination-link is-disabled">← Previous</span>
          )}
          <span className="admin-pagination-meta">
            Page <strong>{currentPage}</strong> / {totalPages}
          </span>
          {currentPage < totalPages ? (
            <Link href={pageHref(currentPage + 1)} className="admin-pagination-link">
              Next →
            </Link>
          ) : (
            <span className="admin-pagination-link is-disabled">Next →</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
