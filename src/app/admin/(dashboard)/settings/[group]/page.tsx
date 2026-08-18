import { notFound, redirect } from "next/navigation";

import AdminGoogleReviewsPanel from "@/components/admin/AdminGoogleReviewsPanel";
import AdminInstagramPanel from "@/components/admin/AdminInstagramPanel";
import AdminLanguagesPanel from "@/components/admin/AdminLanguagesPanel";
import AdminOpeningHoursEditor from "@/components/admin/AdminOpeningHoursEditor";
import AdminSettingsForm from "@/components/admin/AdminSettingsForm";
import AdminSettingsShell from "@/components/admin/AdminSettingsShell";
import AdminWordpressImportPanel from "@/components/admin/AdminWordpressImportPanel";
import { requireAdminPage } from "@/lib/admin-access";
import { getGoogleReviewsConnectionStatus } from "@/lib/google-reviews";
import { LOCALE_CATALOG } from "@/lib/i18n/locale-codes";
import { listShopLanguages } from "@/lib/i18n/shop-languages";
import { getInstagramConnectionStatus } from "@/lib/instagram";
import { buildAdminSettingsView } from "@/lib/site-settings-db";
import { getSettingGroup, isSettingGroupId } from "@/lib/site-settings-defs";
import { isWooCommerceApiConfigured } from "@/lib/woocommerce-api";

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
  const instagramStatus = groupId === "instagram" ? await getInstagramConnectionStatus() : null;
  const googleStatus = groupId === "google" ? await getGoogleReviewsConnectionStatus() : null;
  const featuredJson = fields.find((f) => f.key === "GOOGLE_REVIEWS_FEATURED_JSON")?.displayValue ?? "";
  const wooConfigured = groupId === "woocommerce" ? await isWooCommerceApiConfigured() : false;
  const languages = groupId === "languages" ? await listShopLanguages() : [];

  return (
    <AdminSettingsShell activeGroup={groupId}>
      <div className="admin-stack">
        {groupId === "languages" ? (
          <AdminLanguagesPanel initialLanguages={languages} catalog={LOCALE_CATALOG} />
        ) : (
          <AdminSettingsForm groupId={groupId} initialFields={groupFields} />
        )}
        {groupId === "store" ? <AdminOpeningHoursEditor initialJson={hoursJson} /> : null}
        {instagramStatus ? <AdminInstagramPanel initial={instagramStatus} /> : null}
        {googleStatus ? (
          <AdminGoogleReviewsPanel initial={googleStatus} initialFeaturedJson={featuredJson} />
        ) : null}
        {groupId === "woocommerce" ? <AdminWordpressImportPanel wooConfigured={wooConfigured} /> : null}
      </div>
    </AdminSettingsShell>
  );
}
