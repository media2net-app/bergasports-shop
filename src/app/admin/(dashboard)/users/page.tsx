import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import { requireSuperAdminPage } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireSuperAdminPage();
  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Admin users</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Manage accounts with dashboard access. Super admins see Easy Sales sales on the dashboard.
          </p>
        </div>
      </div>
      <AdminUsersPanel />
    </div>
  );
}
