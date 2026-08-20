import AdminNewsletterPanel from "@/components/admin/AdminNewsletterPanel";
import {
  listNewsletterCampaigns,
  listNewsletterSubscribers,
  serializeNewsletterCampaign,
  serializeNewsletterSubscriber,
} from "@/lib/newsletter-admin";
import { DEFAULT_NEWSLETTER_PROMO_CODE, getNewsletterPromo } from "@/lib/newsletter";

export const dynamic = "force-dynamic";

export default async function AdminNewsletterPage() {
  const [subscribers, campaigns, promo] = await Promise.all([
    listNewsletterSubscribers({ limit: 2000 }).catch(() => []),
    listNewsletterCampaigns().catch(() => []),
    getNewsletterPromo().catch(() => ({
      code: DEFAULT_NEWSLETTER_PROMO_CODE,
      percent: 5,
      label: "5% korting",
    })),
  ]);

  return (
    <AdminNewsletterPanel
      promoCode={promo.code}
      initialSubscribers={subscribers.map(serializeNewsletterSubscriber)}
      initialCampaigns={campaigns.map(serializeNewsletterCampaign)}
    />
  );
}
