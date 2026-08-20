import AdminMarketingNav from "@/components/admin/AdminMarketingNav";

export default function AdminMarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-marketing-layout">
      <AdminMarketingNav />
      {children}
    </div>
  );
}
