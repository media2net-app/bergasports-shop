import AdminMarketingView from "@/components/admin/AdminMarketingView";
import { requireAdminPage } from "@/lib/admin-access";
import { getMarketingDashboardMetrics } from "@/lib/marketing-metrics";

export const metadata = {
  title: "Marketing — Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminMarketingPage() {
  await requireAdminPage();
  const data = await getMarketingDashboardMetrics();

  return (
    <AdminMarketingView
      data={data}
      winBackExpiryDays={process.env.MARKETING_WINBACK_EXPIRY_DAYS?.trim() || "14"}
    />
  );
}
