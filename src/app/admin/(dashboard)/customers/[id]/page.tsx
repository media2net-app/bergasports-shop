import { notFound } from "next/navigation";

import AdminCustomerEditor from "@/components/admin/AdminCustomerEditor";
import { getAdminCustomer } from "@/lib/customers-admin";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AdminCustomerEditPage({ params }: PageProps) {
  const { id } = await params;
  const customer = await getAdminCustomer(id).catch(() => null);
  if (!customer) notFound();
  return <AdminCustomerEditor customer={customer} />;
}
