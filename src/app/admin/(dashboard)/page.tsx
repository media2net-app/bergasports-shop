import AdminDashboardView from "@/components/admin/AdminDashboardView";
import { getAdminDashboardStats } from "@/lib/dashboard-stats";
import { isWritableFilesystem } from "@/lib/trendyol-json-store";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [stats, writable] = await Promise.all([
    getAdminDashboardStats(),
    Promise.resolve(isWritableFilesystem()),
  ]);

  return (
    <AdminDashboardView
      writable={writable}
      shopOrders={stats.shopOrders}
      productsCount={stats.productsCount}
      pagesPublished={stats.pagesPublished}
      pagesTotal={stats.pagesTotal}
    />
  );
}
