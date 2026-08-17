import AdminUsersPanel from "@/components/admin/AdminUsersPanel";
import { requireSuperAdminPage } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  await requireSuperAdminPage();

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Gebruikers</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Beheer wie toegang heeft tot de adminomgeving. Een super admin kan gebruikers toevoegen en
            rollen wijzigen.
          </p>
        </div>
      </div>
      <AdminUsersPanel />
    </div>
  );
}
