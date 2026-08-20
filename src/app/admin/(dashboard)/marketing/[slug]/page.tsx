import { notFound } from "next/navigation";

import AdminMarketingChannelPanel from "@/components/admin/AdminMarketingChannelPanel";
import { requireAdminPage } from "@/lib/admin-access";
import {
  getEmailChannelStats,
  getMarketingChannelInsight,
  getShopContext30d,
} from "@/lib/marketing-channel-insights";
import {
  getMarketingChannel,
  marketingChannelIdFromSlug,
} from "@/lib/marketing-channels";
import { marketingChannelEnvStatusAsync } from "@/lib/marketing-channels-server";
import { getMarketingChannelStackPanel } from "@/lib/marketing-channel-stack";
import { getTikTokCatalogHealth } from "@/lib/tiktok-catalog-health";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const id = marketingChannelIdFromSlug(slug);
  const channel = id ? getMarketingChannel(id) : null;
  return {
    title: channel ? `${channel.label} — Marketing` : "Marketing — Admin",
  };
}

export default async function AdminMarketingChannelPage({ params }: Props) {
  await requireAdminPage();
  const { slug } = await params;
  const channelId = marketingChannelIdFromSlug(slug);
  if (!channelId) {
    notFound();
  }

  const channel = getMarketingChannel(channelId);
  if (!channel) {
    notFound();
  }

  const [env, insight, shop, emailStats, tiktokHealth, channelStack] = await Promise.all([
    marketingChannelEnvStatusAsync(channel.envKeys),
    getMarketingChannelInsight(channelId),
    getShopContext30d(),
    channelId === "email" ? getEmailChannelStats() : Promise.resolve(null),
    channelId === "tiktok" ? getTikTokCatalogHealth() : Promise.resolve(null),
    getMarketingChannelStackPanel(channelId),
  ]);

  const tiktok =
    tiktokHealth != null
      ? {
          productsVisible: tiktokHealth.productsVisible,
          productsWithImage: tiktokHealth.productsWithImage,
          feedReady: tiktokHealth.feedReady,
          pixelLabel: tiktokHealth.pixel.label,
          eventsApi: tiktokHealth.pixel.eventsApiConfigured,
        }
      : null;

  return (
    <AdminMarketingChannelPanel
      channel={channel}
      envConfigured={env.configured}
      envItems={env.items}
      insight={insight}
      shop={shop}
      emailStats={emailStats}
      tiktok={tiktok}
      channelStack={channelStack}
    />
  );
}
