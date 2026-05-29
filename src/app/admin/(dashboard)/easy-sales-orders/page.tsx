import { requireSuperAdminPage } from "@/lib/admin-access";
import { listEasySalesDashboardOrders } from "@/lib/easy-sales-dashboard-stats";
import { formatProductPrice } from "@/lib/products";

export const dynamic = "force-dynamic";

function formatDate(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
}

export default async function AdminEasySalesOrdersPage() {
  await requireSuperAdminPage();
  const orders = (await listEasySalesDashboardOrders()) ?? [];
  const recent = [...orders]
    .sort((a, b) => (b.orderDate > a.orderDate ? 1 : -1))
    .slice(0, 500);

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Easy Sales orders</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            All channels (eMAG, Trendyol, site, etc.) — read only. Checkout orders from the shop appear under{" "}
            <a href="/admin/orders" className="font-semibold text-[#96741f] underline">
              Shop orders
            </a>
            .
          </p>
        </div>
      </div>

      <div className="admin-panel admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Channel</th>
              <th>Customer</th>
              <th className="admin-table-num">Total</th>
            </tr>
          </thead>
          <tbody>
            {recent.length === 0 ? (
              <tr>
                <td colSpan={5} className="admin-muted">
                  No orders yet, or Easy Sales is not configured.
                </td>
              </tr>
            ) : (
              recent.map((o, i) => (
                <tr key={`${o.orderDate}-${o.customerEmail}-${i}`}>
                  <td>{formatDate(o.orderDate)}</td>
                  <td>{o.status}</td>
                  <td>{o.marketplace}</td>
                  <td>{o.customerEmail || "—"}</td>
                  <td className="admin-table-num">{formatProductPrice(o.total, "RON")}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {orders.length > 500 ? (
          <p className="admin-muted admin-m-0 admin-mt-05">Showing first 500 of {orders.length} orders.</p>
        ) : null}
      </div>
    </div>
  );
}
