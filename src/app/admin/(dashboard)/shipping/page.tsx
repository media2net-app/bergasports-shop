import AdminShippingRatesPanel from "@/components/admin/AdminShippingRatesPanel";
import { listAdminShippingRates } from "@/lib/shipping-rates-db";

export const dynamic = "force-dynamic";

export default async function AdminShippingPage() {
  const rates = await listAdminShippingRates().catch(() => []);
  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Verzending</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Tarieven in de checkout per land. Lege tabel = ingebouwde standaardprijzen.
          </p>
        </div>
      </div>
      <AdminShippingRatesPanel initialRates={rates} />
    </div>
  );
}
