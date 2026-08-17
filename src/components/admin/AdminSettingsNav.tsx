import Link from "next/link";

import {
  SITE_SETTING_GROUPS,
  SITE_SETTING_SECTIONS,
  type SiteSettingGroupId,
} from "@/lib/site-settings-defs";

export default function AdminSettingsNav({
  activeGroup,
}: {
  activeGroup?: SiteSettingGroupId | null;
}) {
  return (
    <nav className="admin-settings-sidenav" aria-label="Instellingen">
      {SITE_SETTING_SECTIONS.map((section) => {
        const groups = SITE_SETTING_GROUPS.filter((g) => g.section === section.id);
        return (
          <div key={section.id} className="admin-settings-sidenav-section">
            <p className="admin-settings-sidenav-label">{section.title}</p>
            {groups.map((group) => {
              const active = activeGroup === group.id;
              return (
                <Link
                  key={group.id}
                  href={`/admin/settings/${group.id}`}
                  className={`admin-settings-sidenav-link${active ? " is-active" : ""}`}
                >
                  {group.navLabel}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
