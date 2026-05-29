import Link from "next/link";
import { notFound } from "next/navigation";

import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { getCustomerByKey, listOrdersForCustomerKey } from "@/lib/orders-db";
import { formatProductPrice } from "@/lib/products";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ key: string }>;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  const { key } = await params;
  const decodedKey = decodeURIComponent(key);

  const [customer, orders] = await Promise.all([
    getCustomerByKey(decodedKey),
    listOrdersForCustomerKey(decodedKey),
  ]);

  if (!customer) {
    notFound();
  }

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <Link href="/admin/customers" className="admin-breadcrumb">
            ← Customers
          </Link>
          <h1 className="admin-h1 admin-m-0 admin-mt-05">{customer.name}</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">{customer.phone}</p>
        </div>
      </div>

      <div
        className="admin-stack admin-stack-tight"
        style={{ display: "grid", gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}
      >
        <div className="admin-panel admin-stack-tight">
          <h2 className="admin-h2 admin-m-0">Contact</h2>
          <p className="admin-muted admin-m-0">
            {customer.email ? (
              <a href={`mailto:${customer.email}`} className="admin-link">
                {customer.email}
              </a>
            ) : (
              "No email"
            )}
          </p>
          <p className="admin-muted admin-m-0">City: {customer.city ?? "—"}</p>
        </div>
        <div className="admin-panel admin-stack-tight">
          <h2 className="admin-h2 admin-m-0">Summary</h2>
          <p className="admin-stat-value">{customer.orderCount}</p>
          <p className="admin-muted admin-m-0">orders</p>
          <p className="admin-stat-value admin-mt-1">
            {formatProductPrice(customer.totalSpent, customer.currency)}
          </p>
          <p className="admin-muted admin-m-0">total spent</p>
          <p className="admin-muted admin-m-0 admin-mt-1" style={{ fontSize: "0.8rem" }}>
            First order: {formatDate(customer.firstOrderAt)}
            <br />
            Last order: {formatDate(customer.lastOrderAt)}
          </p>
        </div>
      </div>

      <div className="admin-panel admin-stack-tight">
        <h2 className="admin-h2 admin-m-0">Orders</h2>
        {orders.length === 0 ? (
          <p className="admin-muted admin-m-0">No orders.</p>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Status</th>
                  <th className="admin-td-right">Total</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="admin-table-row-click">
                    <td className="admin-td-mono">
                      <Link href={`/admin/orders/${order.id}`}>{order.order_number}</Link>
                    </td>
                    <td>
                      <span className="admin-badge-src">{ORDER_STATUS_LABEL[order.status]}</span>
                    </td>
                    <td className="admin-td-right admin-td-mono">
                      {formatProductPrice(order.total, order.currency)}
                    </td>
                    <td className="admin-muted" style={{ fontSize: "0.75rem" }}>
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
