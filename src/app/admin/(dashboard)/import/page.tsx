import { readRalexCategoriesFile } from "@/lib/ralex-categories-file";
import { isWritableFilesystem } from "@/lib/trendyol-json-store";

import AdminImportPanel from "@/components/admin/AdminImportPanel";

export const dynamic = "force-dynamic";

export default async function AdminImportPage() {
  const writable = isWritableFilesystem();
  const ralexInitial = await readRalexCategoriesFile();

  return <AdminImportPanel writable={writable} ralexInitial={ralexInitial} />;
}
