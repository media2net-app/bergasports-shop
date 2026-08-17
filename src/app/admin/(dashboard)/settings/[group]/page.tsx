import { notFound, redirect } from "next/navigation";

import AdminOpeningHoursEditor from "@/components/admin/AdminOpeningHoursEditor";
import AdminSettingsForm from "@/components/admin/AdminSettingsForm";
import AdminSettingsShell from "@/components/admin/AdminSettingsShell";
import { requireAdminPage } from "@/lib/admin-access";
import { buildAdminSettingsView } from "@/lib/site-settings-db";
import { getSettingGroup, isSettingGroupId } from "@/lib/site-settings-defs";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ group: string }>;
};

const ALIASES: Record<string, string> = {
  contact: "store",
};

export default async function AdminSettingsGroupPage({ params }: PageProps) {
  await requireAdminPage();
  const { group: rawGroup } = await params;
  const groupId = ALIASES[rawGroup] ?? rawGroup;
  if (groupId !== rawGroup) {
    redirect(`/admin/settings/${groupId}`);
  }
  if (!isSettingGroupId(groupId)) {
    notFound();
  }
  const group = getSettingGroup(groupId);
  if (!group) {
    notFound();
  }

  const fields = await buildAdminSettingsView();
  const groupFields = fields.filter((f) => f.group === groupId && !f.hidden);
  const hoursJson = fields.find((f) => f.key === "SHOP_OPENING_HOURS_JSON")?.displayValue ?? "";

  return (
    <AdminSettingsShell activeGroup={groupId}>
      <div className="admin-stack">
        <AdminSettingsForm groupId={groupId} initialFields={groupFields} />
        {groupId === "store" ? <AdminOpeningHoursEditor initialJson={hoursJson} /> : null}
      </div>
    </AdminSettingsShell>
  );
}
