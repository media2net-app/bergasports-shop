import AdminDashboardShell from "@/components/admin/AdminDashboardShell";
import { getAdminRoleLabel, isSuperAdminSession } from "@/lib/admin-auth";
import { requireAdminPage } from "@/lib/admin-access";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();
  return (
    <AdminDashboardShell roleLabel={getAdminRoleLabel(session)} superAdmin={isSuperAdminSession(session)}>
      {children}
    </AdminDashboardShell>
  );
}
