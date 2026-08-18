import Link from "next/link";

import { listAdminCustomerDirectory } from "@/lib/customers-admin";
import { formatProductPrice } from "@/lib/products";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ q?: string }>;
};

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const search = typeof sp.q === "string" ? sp.q.trim() : "";
  const { accounts, guests } = await listAdminCustomerDirectory(search || undefined).catch(() => ({
    accounts: [],
    guests: [],
  }));

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Klanten</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Webshop-accounts en gasten uit bestellingen
            {accounts.length || guests.length ? ` · ${accounts.length} accounts · ${guests.length} gasten` : ""}.
          </p>
        </div>
        <div className="admin-tools-row">
          <form className="admin-tools-row" action="/admin/customers" method="get">
            <input
              className="admin-field admin-field--flush"
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Naam, e-mail, telefoon"
              aria-label="Klanten zoeken"
              style={{ minWidth: "16rem", marginBottom: 0 }}
            />
            <button type="submit" className="admin-btn-secondary">
              Zoeken
            </button>
            {search ? (
              <Link href="/admin/customers" className="admin-link-action">
                Wis
              </Link>
            ) : null}
          </form>
          <Link href="/admin/customers/new" className="admin-btn-primary">
            Nieuwe klant
          </Link>
        </div>
      </div>

      <div className="admin-panel admin-table-wrap">
        <h2 className="admin-h2">Accounts</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Contact</th>
              <th>Bestellingen</th>
              <th>Omzet</th>
              <th>Laatste order</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-muted">
                  Nog geen klantaccounts{search ? " voor deze zoekopdracht" : ""}.
                </td>
              </tr>
            ) : (
              accounts.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <Link href={`/admin/customers/${customer.id}`}>{customer.name}</Link>
                    {customer.addressCount ? (
                      <span className="admin-badge-src" style={{ marginLeft: "0.4rem" }}>
                        {customer.addressCount} adres{customer.addressCount === 1 ? "" : "sen"}
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
                    {customer.lastOrderId ? (
                      <>
                        <Link href={`/admin/orders/${customer.lastOrderId}`} className="admin-link-action">
                          {customer.lastOrderNumber}
                        </Link>
                        {customer.lastOrderAt ? (
                          <div className="admin-muted">
                            {new Date(customer.lastOrderAt).toLocaleDateString("nl-NL")}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <span className="admin-muted">—</span>
                    )}
                  </td>
                  <td>
                    <Link href={`/admin/customers/${customer.id}`} className="admin-link-action">
                      Bewerken
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="admin-panel admin-table-wrap">
        <h2 className="admin-h2">Gasten (uit bestellingen)</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Naam</th>
              <th>Contact</th>
              <th>Bestellingen</th>
              <th>Omzet</th>
              <th>Laatste order</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {guests.length === 0 ? (
              <tr>
                <td colSpan={6} className="admin-muted">
                  Geen gasten zonder account{search ? " voor deze zoekopdracht" : ""}.
                </td>
              </tr>
            ) : (
              guests.map((customer) => {
                const createHref = `/admin/customers/new?${new URLSearchParams({
                  ...(customer.email ? { email: customer.email } : {}),
                  ...(customer.name ? { name: customer.name } : {}),
                  ...(customer.phone ? { phone: customer.phone } : {}),
                }).toString()}`;
                return (
                  <tr key={`${customer.email ?? ""}-${customer.phone ?? ""}-${customer.lastOrderNumber ?? ""}`}>
                    <td>{customer.name}</td>
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
                      {customer.lastOrderId ? (
                        <>
                          <Link href={`/admin/orders/${customer.lastOrderId}`} className="admin-link-action">
                            {customer.lastOrderNumber}
                          </Link>
                          {customer.lastOrderAt ? (
                            <div className="admin-muted">
                              {new Date(customer.lastOrderAt).toLocaleDateString("nl-NL")}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td>
                      <Link href={createHref} className="admin-link-action">
                        Account aanmaken
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
