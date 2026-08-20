import AdminAnalyticsLive from "@/components/admin/analytics/AdminAnalyticsLive";
import { requireAdminPage } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireAdminPage();
  return <AdminAnalyticsLive />;
}
