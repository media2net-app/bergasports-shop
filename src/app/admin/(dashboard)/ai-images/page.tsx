import AdminAiImagesPanel from "@/components/admin/AdminAiImagesPanel";

export const dynamic = "force-dynamic";

export default function AdminAiImagesPage() {
  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Generate</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Four steps: category → product → preview side by side → generate. Overlay data is read from the product
            (sizes, cm, variations). <strong>Aspect ratio:</strong> use the same frame as the shop — card images are{" "}
            <code className="rounded bg-[#f2f4f7] px-1">401×601</code> (see <code className="rounded bg-[#f2f4f7] px-1">variant=&quot;card&quot;</code> / templates) so AI output matches PDP and listing grids.
          </p>
        </div>
      </div>

      <AdminAiImagesPanel />
    </div>
  );
}
