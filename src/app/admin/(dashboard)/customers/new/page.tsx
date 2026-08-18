import AdminCustomerEditor from "@/components/admin/AdminCustomerEditor";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams?: Promise<{ email?: string; name?: string; phone?: string }>;
};

export default async function AdminCustomerNewPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  return (
    <AdminCustomerEditor
      prefill={{
        email: typeof sp.email === "string" ? sp.email : "",
        name: typeof sp.name === "string" ? sp.name : "",
        phone: typeof sp.phone === "string" ? sp.phone : "",
      }}
    />
  );
}
