import AdminOneMillionPlanView from "@/components/admin/AdminOneMillionPlanView";
import { isSuperAdminSession } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/admin-session";
import { aggregateShopOrders } from "@/lib/dashboard-aggregates";
import { getAdminDashboardStats } from "@/lib/dashboard-stats";
import { getOneMillionPlanSignals } from "@/lib/one-million-plan-status";

export const dynamic = "force-dynamic";

export default async function AdminOneMillionPlanPage() {
  const session = await getAdminSession();
  const superAdmin = isSuperAdminSession(session);
  const [signals, stats] = await Promise.all([
    getOneMillionPlanSignals(),
    getAdminDashboardStats(),
  ]);
  const shopAllTime = aggregateShopOrders(stats.shopOrders, "all");

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">1 Million Plan</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Roadmap to 1,000,000 RON in shop sales on bergasports.com — track revenue progress,
            pillars, and execution checklist.
          </p>
        </div>
      </div>
      <AdminOneMillionPlanView
        signals={signals}
        superAdmin={superAdmin}
        shopRevenueRon={shopAllTime.revenue}
      />
    </div>
  );
}
