import { requireAdminPage } from "@/lib/admin-access";
import AdminSettingsForm from "@/components/admin/AdminSettingsForm";
import { buildAdminSettingsView } from "@/lib/site-settings-db";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  await requireAdminPage();
  const fields = await buildAdminSettingsView();

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Instellingen</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            API-keys en koppelingen beheren. Per key staat een handleiding: waar je de key haalt en waar hij voor
            dient. Geheimen blijven gemaskeerd; laat het veld leeg om de huidige key te behouden.
          </p>
        </div>
      </div>

      <AdminSettingsForm initialFields={fields} />
    </div>
  );
}
