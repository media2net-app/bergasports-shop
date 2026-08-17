import Link from "next/link";

import { formatProductPrice } from "@/lib/products";
import { listShopCustomers } from "@/lib/shop-customers";

export const dynamic = "force-dynamic";

export default async function AdminCustomersPage() {
  const customers = await listShopCustomers().catch(() => []);

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Klanten</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Overzicht vanuit bestellingen{customers.length ? ` · ${customers.length} klanten` : ""}.
          </p>
        </div>
      </div>
      <div className="admin-panel admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Contact</th>
              <th>Bestellingen</th>
              <th>Omzet</th>
              <th>Laatste order</th>
            </tr>
          </thead>
          <tbody>
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-muted">
                  Nog geen klanten uit bestellingen.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.key}>
                  <td>
                    {customer.name}
                    {customer.hasAccount ? (
                      <span className="admin-badge-src" style={{ marginLeft: "0.4rem" }}>
                        Account
                      </span>
                    ) : null}
                  </td>
                  <td className="admin-muted">
                    {customer.email ? (
                      <a href={`mailto:${customer.email}`} className="admin-link-action">
                        {customer.email}
                      </a>
                    ) : (
                      "—"
                    )}
                    {customer.phone ? (
                      <>
                        <br />
                        {customer.phone}
                      </>
                    ) : null}
                  </td>
                  <td>{customer.orderCount}</td>
                  <td>{formatProductPrice(customer.totalSpent, customer.currency)}</td>
                  <td>
                    <Link
                      href={`/admin/orders?q=${encodeURIComponent(customer.email || customer.phone)}`}
                      className="admin-link-action"
                    >
                      {customer.lastOrderNumber}
                    </Link>
                    <div className="admin-muted">
                      {new Date(customer.lastOrderAt).toLocaleDateString("nl-NL")}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
