import AdminAiTemplateMappingsPanel from "@/components/admin/AdminAiTemplateMappingsPanel";

export const dynamic = "force-dynamic";

export default function AdminAiImageTemplatesPage() {
  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Templates</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Map shop categories to reference templates for automatic selection during image generation.
          </p>
        </div>
      </div>

      <AdminAiTemplateMappingsPanel />
    </div>
  );
}
