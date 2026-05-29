import AdminReportsView from "@/components/admin/AdminReportsView";
import { isSuperAdminSession } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/admin-session";
import { getRonPerEur } from "@/lib/dashboard-currency";
import { getAdminDashboardStats } from "@/lib/dashboard-stats";
import { listEasySalesDashboardOrders } from "@/lib/easy-sales-dashboard-stats";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const session = await getAdminSession();
  const superAdmin = isSuperAdminSession(session);
  const [stats, easySalesOrders] = await Promise.all([
    getAdminDashboardStats(),
    superAdmin ? listEasySalesDashboardOrders() : Promise.resolve(null),
  ]);

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Reports</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Sales summary by period — shop checkout and, for super admins, Easy Sales.
          </p>
        </div>
      </div>
      <AdminReportsView
        superAdmin={superAdmin}
        ronPerEur={getRonPerEur()}
        shopOrders={stats.shopOrders}
        easySalesOrders={easySalesOrders ?? []}
        easySalesReady={Boolean(easySalesOrders)}
      />
    </div>
  );
}
