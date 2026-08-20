import AdminAttributesPanel from "@/components/admin/AdminAttributesPanel";
import { listAdminAttributes } from "@/lib/attributes-db";

export const dynamic = "force-dynamic";

export default async function AdminAttributesPage() {
  const attributes = await listAdminAttributes().catch(() => []);
  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Eigenschappen</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Globale productattributen en termen (zoals in WooCommerce). Worden geïmporteerd bij
            product- of eigenschappenimport.
          </p>
        </div>
      </div>
      <AdminAttributesPanel initialAttributes={attributes} />
    </div>
  );
}
