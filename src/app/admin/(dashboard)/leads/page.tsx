import AdminLeadsPanel from "@/components/admin/AdminLeadsPanel";
import { listContactLeads } from "@/lib/contact-leads-db";

export const dynamic = "force-dynamic";

export default async function AdminLeadsPage() {
  const leads = await listContactLeads();
  return (
    <AdminLeadsPanel
      initialLeads={leads.map((lead) => ({
        ...lead,
        createdAt: lead.createdAt.toISOString(),
      }))}
    />
  );
}
