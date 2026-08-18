import { notFound } from "next/navigation";

import AdminEmailTemplateEditor from "@/components/admin/AdminEmailTemplateEditor";
import { isEmailTemplateKey } from "@/lib/email-template-defs";
import { getEmailTemplate } from "@/lib/email-templates-db";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ key: string }> };

export default async function AdminEmailTemplateEditPage({ params }: Props) {
  const { key } = await params;
  const decoded = decodeURIComponent(key);
  if (!isEmailTemplateKey(decoded)) notFound();
  const template = await getEmailTemplate(decoded);
  return <AdminEmailTemplateEditor template={template} />;
}
