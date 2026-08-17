import type { ReactNode } from "react";

import AdminSettingsNav from "@/components/admin/AdminSettingsNav";
import type { SiteSettingGroupId } from "@/lib/site-settings-defs";

export default function AdminSettingsShell({
  activeGroup,
  children,
}: {
  activeGroup: SiteSettingGroupId;
  children: ReactNode;
}) {
  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Instellingen</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Kies een onderdeel links. Geheimen blijven gemaskeerd; laat een veld leeg om de huidige
            waarde te behouden.
          </p>
        </div>
      </div>
      <div className="admin-settings-split">
        <AdminSettingsNav activeGroup={activeGroup} />
        <div className="admin-settings-pane">{children}</div>
      </div>
    </div>
  );
}
