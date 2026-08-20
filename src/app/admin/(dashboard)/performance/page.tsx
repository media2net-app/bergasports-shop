import AdminPerformancePanel from "@/components/admin/performance/AdminPerformancePanel";
import { requireAdminPage } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminPerformancePage() {
  await requireAdminPage();
  return <AdminPerformancePanel />;
}
