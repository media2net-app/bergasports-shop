import AdminDashboardView from "@/components/admin/AdminDashboardView";
import { isSuperAdminSession } from "@/lib/admin-auth";
import { getAdminSession } from "@/lib/admin-session";
import { getRonPerEur } from "@/lib/dashboard-currency";
import { getAdminDashboardStats } from "@/lib/dashboard-stats";
import { listEasySalesDashboardOrders } from "@/lib/easy-sales-dashboard-stats";
import { isWritableFilesystem } from "@/lib/trendyol-json-store";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  const superAdmin = isSuperAdminSession(session);

  const [stats, writable, easySalesOrders] = await Promise.all([
    getAdminDashboardStats(),
    Promise.resolve(isWritableFilesystem()),
    superAdmin ? listEasySalesDashboardOrders() : Promise.resolve(null),
  ]);

  return (
    <AdminDashboardView
      superAdmin={superAdmin}
      writable={writable}
      ronPerEur={getRonPerEur()}
      shopOrders={stats.shopOrders}
      easySalesOrders={easySalesOrders ?? []}
      easySalesReady={Boolean(easySalesOrders)}
      productsCount={stats.productsCount}
      categoriesCount={stats.categoriesCount}
      pagesPublished={stats.pagesPublished}
      pagesTotal={stats.pagesTotal}
    />
  );
}
