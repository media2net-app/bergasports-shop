"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import AdminMetricCard from "@/components/admin/AdminMetricCard";
import { IconCheck, IconImport, IconRevenue } from "@/components/admin/AdminMetricIcons";
import type { MarketingChannelStackPanel } from "@/lib/marketing-channel-stack";
import {
  marketingEnvLabel,
  type MarketingChannelConfig,
  type MarketingChannelId,
} from "@/lib/marketing-channels";
import {
  computeChannelRoi,
  type MarketingCampaignRow,
  type MarketingChannelInsightRow,
  type MarketingChannelShopContext,
  type MarketingEmailChannelStats,
} from "@/lib/marketing-channel-insights-shared";

type TikTokExtras = {
  productsVisible: number;
  productsWithImage: number;
  feedReady: boolean;
  pixelLabel: string;
  eventsApi: boolean;
} | null;

type Props = {
  channel: MarketingChannelConfig;
  envConfigured: boolean;
  envItems: { key: string; set: boolean }[];
  insight: MarketingChannelInsightRow;
  shop: MarketingChannelShopContext;
  emailStats: MarketingEmailChannelStats | null;
  tiktok: TikTokExtras;
  channelStack: MarketingChannelStackPanel | null;
};

const CAMPAIGN_EMPTY_COPY: Record<MarketingChannelId, string> = {
  tiktok: "No campaigns yet. Copy names and spend from TikTok Ads Manager.",
  meta: "No campaigns yet. Copy from Meta Ads Manager (Advantage+, catalog, retargeting).",
  google_ads: "No campaigns yet. Copy from Google Ads (Search, Shopping, PMax).",
  google_merchant: "Optional — note Shopping campaigns tied to your feed.",
  email: "Optional — e.g. welcome series, win-back, or promo sends.",
};

const PERFORMANCE_LEAD_COPY: Record<MarketingChannelId, string> = {
  tiktok: "Paste weekly totals from TikTok Ads Manager.",
  meta: "Paste weekly totals from Meta Ads Manager.",
  google_ads:
    "Sync from Google Ads API (Instellingen → Pixels) or paste weekly totals manually.",
  google_merchant: "Track feed-related ad spend and attributed Shopping revenue.",
  email: "Attribute revenue to email flows (welcome, post-purchase, win-back).",
};

function emptyCampaign(): MarketingCampaignRow {
  return {
    id: crypto.randomUUID(),
    name: "",
    status: "active",
    budgetRon: 0,
    spendRon: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    notes: "",
  };
}

function formatRon(amount: number): string {
  if (amount <= 0) {
    return "—";
  }
  return `${amount.toLocaleString("ro-RO", { maximumFractionDigits: 0 })} RON`;
}

function envSummary(items: { key: string; set: boolean }[]): string {
  if (items.length === 0) {
    return "No env required";
  }
  const set = items.filter((i) => i.set).length;
  return `${set} of ${items.length} configured`;
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`admin-marketing-pill${ok ? " is-ok" : " is-warn"}`}>{label}</span>;
}

function isExternalHref(href: string): boolean {
  return href.startsWith("http://") || href.startsWith("https://");
}

function ChannelStackSection({ panel }: { panel: MarketingChannelStackPanel }) {
  return (
    <section className="admin-panel admin-marketing-channel-panel">
      <h2 className="admin-dash-section-title admin-m-0">{panel.title}</h2>
      <ul className="admin-marketing-checklist admin-m-0 admin-mt-05">
        {panel.items.map((item) => (
          <li key={item.label}>
            <StatusPill ok={item.ok} label={item.label} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function AdminMarketingChannelPanel({
  channel,
  envConfigured,
  envItems,
  insight: initialInsight,
  shop,
  emailStats,
  tiktok,
  channelStack,
}: Props) {
  const router = useRouter();
  const [insight, setInsight] = useState(initialInsight);
  const [saving, setSaving] = useState(false);
  const [syncingAds, setSyncingAds] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const roi = computeChannelRoi(insight);
  const ctr = insight.impressions > 0 ? ((insight.clicks / insight.impressions) * 100).toFixed(2) : null;
  const hasTrackedData =
    insight.adSpendRon > 0 ||
    insight.attributedRevenueRon > 0 ||
    insight.impressions > 0 ||
    insight.campaigns.length > 0;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/marketing/channels/${channel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(insight),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Save failed.");
        return;
      }
      setMessage("Saved.");
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function handleGoogleAdsSync() {
    setSyncingAds(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/marketing/google-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period: "30d" }),
      });
      const data = (await res.json()) as {
        error?: string;
        metrics?: {
          spend: number;
          impressions: number;
          clicks: number;
          conversions: number;
          conversionValue: number;
          campaigns: MarketingCampaignRow[];
          dateRangeLabel: string;
          fetchedAt: string;
        };
      };
      if (!res.ok || !data.metrics) {
        setError(data.error ?? "Google Ads sync mislukt.");
        return;
      }
      const m = data.metrics;
      setInsight({
        ...insight,
        channel: "google_ads",
        adSpendRon: m.spend,
        attributedRevenueRon: m.conversionValue,
        impressions: m.impressions,
        clicks: m.clicks,
        conversions: Math.round(m.conversions),
        campaigns: m.campaigns,
        notes: `Gesynchroniseerd uit Google Ads API · ${m.dateRangeLabel} · ${m.fetchedAt}`,
        updatedAt: m.fetchedAt,
      });
      setMessage(`Synced from Google Ads (${m.dateRangeLabel}).`);
      router.refresh();
    } catch {
      setError("Network error.");
    } finally {
      setSyncingAds(false);
    }
  }

  function updateCampaign(index: number, patch: Partial<MarketingCampaignRow>) {
    setInsight((prev) => ({
      ...prev,
      campaigns: prev.campaigns.map((c, i) => (i === index ? { ...c, ...patch } : c)),
    }));
  }

  return (
    <div className="admin-page admin-marketing-channel">
      <header className="admin-marketing-channel-head">
        <div className="admin-marketing-channel-head-text">
          <h1 className="admin-page-title">{channel.label}</h1>
          <p className="admin-page-lead admin-m-0">
            {channel.description}
            {channel.profileUrl && channel.profileLabel ? (
              <>
                {" "}
                <a
                  href={channel.profileUrl}
                  target={isExternalHref(channel.profileUrl) ? "_blank" : undefined}
                  rel={isExternalHref(channel.profileUrl) ? "noopener noreferrer" : undefined}
                  className="admin-marketing-channel-profile"
                >
                  {channel.profileLabel}
                </a>
              </>
            ) : null}
          </p>
        </div>
        <div className="admin-marketing-channel-head-actions">
          {channel.id === "google_ads" ? (
            <button
              type="button"
              className="admin-btn admin-btn-primary admin-btn-sm"
              disabled={syncingAds}
              onClick={() => void handleGoogleAdsSync()}
            >
              {syncingAds ? "Sync…" : "Sync Google Ads API"}
            </button>
          ) : null}
          {channel.profileUrl ? (
            <a
              href={channel.profileUrl}
              target={isExternalHref(channel.profileUrl) ? "_blank" : undefined}
              rel={isExternalHref(channel.profileUrl) ? "noopener noreferrer" : undefined}
              className="admin-btn admin-btn-secondary admin-btn-sm"
            >
              {channel.profileLabel ?? "Open"}
            </a>
          ) : null}
          {channel.externalDashboardUrl ? (
            <a
              href={channel.externalDashboardUrl}
              target={isExternalHref(channel.externalDashboardUrl) ? "_blank" : undefined}
              rel={isExternalHref(channel.externalDashboardUrl) ? "noopener noreferrer" : undefined}
              className="admin-btn admin-btn-primary admin-btn-sm"
            >
              {channel.externalDashboardLabel ?? "Dashboard"}
            </a>
          ) : null}
        </div>
      </header>

      <section className="admin-marketing-channel-kpis" aria-label="Channel KPIs">
        <AdminMetricCard
          label="Connection"
          value={envConfigured ? "Ready" : "Setup needed"}
          hint={envSummary(envItems)}
          icon={<IconCheck />}
          iconTone={envConfigured ? "success" : "warning"}
          highlight={!envConfigured}
        />
        <AdminMetricCard
          label="Ad spend"
          value={formatRon(insight.adSpendRon)}
          hint={hasTrackedData ? "Tracked for this channel" : "Add below from Ads Manager"}
          icon={<IconRevenue />}
        />
        <AdminMetricCard
          label="Attributed revenue"
          value={formatRon(insight.attributedRevenueRon)}
          hint="Revenue you assign to this channel"
          icon={<IconRevenue />}
          iconTone="brand"
        />
        <AdminMetricCard
          label="ROAS"
          value={roi.roas != null ? `${roi.roas}×` : "—"}
          hint={
            insight.adSpendRon > 0
              ? [
                  roi.roi != null ? `ROI ${Math.round(roi.roi * 100)}%` : null,
                  roi.profitRon >= 0
                    ? `Profit ${formatRon(roi.profitRon)}`
                    : `Loss ${formatRon(Math.abs(roi.profitRon))}`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : "Needs ad spend"
          }
          icon={<IconImport />}
          iconTone={roi.roas != null && roi.roas >= 1 ? "success" : "default"}
        />
      </section>

      <div className="admin-marketing-columns">
        <section className="admin-panel admin-marketing-channel-panel">
          <div className="admin-marketing-panel-head">
            <h2 className="admin-dash-section-title admin-m-0">Shop context</h2>
            <span className="admin-marketing-panel-badge">30 days</span>
          </div>
          <p className="admin-muted admin-m-0 admin-marketing-panel-lead">
            Whole-store baseline — compare with attributed revenue above.
          </p>
          <div className="admin-marketing-mini-metrics">
            <div className="admin-marketing-mini-metric">
              <span className="admin-marketing-mini-label">Revenue</span>
              <span className="admin-marketing-mini-value">{formatRon(shop.revenueRon30d)}</span>
            </div>
            <div className="admin-marketing-mini-metric">
              <span className="admin-marketing-mini-label">Orders</span>
              <span className="admin-marketing-mini-value">{shop.orders30d || "—"}</span>
            </div>
            <div className="admin-marketing-mini-metric">
              <span className="admin-marketing-mini-label">AOV</span>
              <span className="admin-marketing-mini-value">{formatRon(shop.aovRon)}</span>
            </div>
          </div>
        </section>

        {tiktok ? (
          <section className="admin-panel admin-marketing-channel-panel">
            <div className="admin-marketing-panel-head">
              <h2 className="admin-dash-section-title admin-m-0">TikTok stack</h2>
            </div>
            <ul className="admin-marketing-checklist admin-m-0">
              <li>
                <StatusPill ok={tiktok.pixelLabel === "Active"} label={`Pixel · ${tiktok.pixelLabel}`} />
              </li>
              <li>
                <StatusPill ok={tiktok.eventsApi} label={tiktok.eventsApi ? "Events API · On" : "Events API · Off"} />
              </li>
              <li>
                <StatusPill
                  ok={tiktok.feedReady}
                  label={
                    tiktok.feedReady
                      ? `Catalog · ${tiktok.productsWithImage}/${tiktok.productsVisible} images`
                      : "Catalog · Incomplete"
                  }
                />
              </li>
            </ul>
          </section>
        ) : null}

        {channelStack ? <ChannelStackSection panel={channelStack} /> : null}

        {emailStats ? (
          <section
            className={`admin-panel admin-marketing-channel-panel${channel.id === "email" ? " admin-marketing-channel-panel--wide" : ""}`}
          >
            <h2 className="admin-dash-section-title admin-m-0">Flow sends</h2>
            <p className="admin-muted admin-m-0 admin-marketing-panel-lead">Automated emails (all time)</p>
            <div className="admin-marketing-mini-metrics admin-marketing-mini-metrics--4">
              <div className="admin-marketing-mini-metric">
                <span className="admin-marketing-mini-label">Welcome</span>
                <span className="admin-marketing-mini-value">{emailStats.welcomeSent}</span>
              </div>
              <div className="admin-marketing-mini-metric">
                <span className="admin-marketing-mini-label">Post-purchase</span>
                <span className="admin-marketing-mini-value">{emailStats.postPurchaseSent}</span>
              </div>
              <div className="admin-marketing-mini-metric">
                <span className="admin-marketing-mini-label">Win-back</span>
                <span className="admin-marketing-mini-value">{emailStats.winBackSent}</span>
              </div>
              <div className="admin-marketing-mini-metric">
                <span className="admin-marketing-mini-label">Consent (30d)</span>
                <span className="admin-marketing-mini-value">{emailStats.consentRatePercent}%</span>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <form className="admin-panel admin-marketing-channel-form" onSubmit={handleSave}>
        <div className="admin-marketing-panel-head">
          <div>
            <h2 className="admin-dash-section-title admin-m-0">
              {channel.id === "email" ? "CRM performance" : "Performance & ROI"}
            </h2>
            <p className="admin-muted admin-m-0 admin-marketing-panel-lead">
              {PERFORMANCE_LEAD_COPY[channel.id]}
            </p>
          </div>
        </div>

        <div className="admin-marketing-form-grid">
          <label className="admin-marketing-field">
            <span>Ad spend (RON)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="0"
              value={insight.adSpendRon || ""}
              onChange={(e) => setInsight({ ...insight, adSpendRon: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="admin-marketing-field">
            <span>Attributed revenue (RON)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              placeholder="0"
              value={insight.attributedRevenueRon || ""}
              onChange={(e) =>
                setInsight({ ...insight, attributedRevenueRon: Number(e.target.value) || 0 })
              }
            />
          </label>
          <label className="admin-marketing-field">
            <span>Impressions</span>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={insight.impressions || ""}
              onChange={(e) => setInsight({ ...insight, impressions: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="admin-marketing-field">
            <span>Clicks{ctr ? ` · CTR ${ctr}%` : ""}</span>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={insight.clicks || ""}
              onChange={(e) => setInsight({ ...insight, clicks: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="admin-marketing-field">
            <span>Conversions</span>
            <input
              type="number"
              min={0}
              placeholder="0"
              value={insight.conversions || ""}
              onChange={(e) => setInsight({ ...insight, conversions: Number(e.target.value) || 0 })}
            />
          </label>
          <label className="admin-marketing-field">
            <span>CPA</span>
            <input
              type="text"
              readOnly
              className="admin-marketing-field-readonly"
              value={roi.cpaRon != null ? `${roi.cpaRon} RON` : "—"}
            />
          </label>
        </div>

        <div className="admin-marketing-campaigns-block">
          <div className="admin-marketing-panel-head admin-marketing-panel-head--tight">
            <h3 className="admin-marketing-subtitle admin-m-0">Campaigns</h3>
            <button
              type="button"
              className="admin-btn admin-btn-secondary admin-btn-sm"
              onClick={() =>
                setInsight((prev) => ({
                  ...prev,
                  campaigns: [...prev.campaigns, emptyCampaign()],
                }))
              }
            >
              Add row
            </button>
          </div>

          {insight.campaigns.length === 0 ? (
            <p className="admin-marketing-empty admin-m-0">{CAMPAIGN_EMPTY_COPY[channel.id]}</p>
          ) : (
            <div className="admin-table-wrap admin-marketing-campaign-table-wrap">
              <table className="admin-table admin-marketing-campaign-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th className="admin-td-right">Budget</th>
                    <th className="admin-td-right">Spend</th>
                    <th className="admin-td-right">Conv.</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {insight.campaigns.map((campaign, index) => (
                    <tr key={campaign.id}>
                      <td>
                        <input
                          type="text"
                          className="admin-marketing-table-input"
                          placeholder="Campaign name"
                          value={campaign.name}
                          onChange={(e) => updateCampaign(index, { name: e.target.value })}
                        />
                      </td>
                      <td>
                        <select
                          className="admin-marketing-table-input"
                          value={campaign.status}
                          onChange={(e) =>
                            updateCampaign(index, {
                              status: e.target.value as MarketingCampaignRow["status"],
                            })
                          }
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="ended">Ended</option>
                        </select>
                      </td>
                      <td className="admin-td-right">
                        <input
                          type="number"
                          min={0}
                          className="admin-marketing-table-input admin-marketing-table-input--num"
                          placeholder="0"
                          value={campaign.budgetRon || ""}
                          onChange={(e) =>
                            updateCampaign(index, { budgetRon: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="admin-td-right">
                        <input
                          type="number"
                          min={0}
                          className="admin-marketing-table-input admin-marketing-table-input--num"
                          placeholder="0"
                          value={campaign.spendRon || ""}
                          onChange={(e) =>
                            updateCampaign(index, { spendRon: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="admin-td-right">
                        <input
                          type="number"
                          min={0}
                          className="admin-marketing-table-input admin-marketing-table-input--num"
                          placeholder="0"
                          value={campaign.conversions || ""}
                          onChange={(e) =>
                            updateCampaign(index, { conversions: Number(e.target.value) || 0 })
                          }
                        />
                      </td>
                      <td className="admin-td-right">
                        <button
                          type="button"
                          className="admin-btn-text admin-marketing-row-remove"
                          onClick={() =>
                            setInsight((prev) => ({
                              ...prev,
                              campaigns: prev.campaigns.filter((_, i) => i !== index),
                            }))
                          }
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <label className="admin-marketing-field admin-marketing-field-full">
          <span>Notes</span>
          <textarea
            rows={3}
            value={insight.notes ?? ""}
            onChange={(e) => setInsight({ ...insight, notes: e.target.value })}
            placeholder="Creative tests, audiences, learnings…"
          />
        </label>

        {envItems.length > 0 ? (
          <details className="admin-marketing-setup">
            <summary>Integration variables ({envSummary(envItems)})</summary>
            <ul className="admin-marketing-setup-list">
              {envItems.map((item) => (
                <li key={item.key} className={item.set ? "is-ok" : "is-missing"}>
                  <span className="admin-marketing-setup-label">{marketingEnvLabel(item.key)}</span>
                  <StatusPill ok={item.set} label={item.set ? "Set" : "Missing"} />
                  <code className="admin-marketing-setup-code">{item.key}</code>
                </li>
              ))}
            </ul>
          </details>
        ) : null}

        <footer className="admin-marketing-form-footer">
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save channel data"}
          </button>
          {message ? <span className="admin-marketing-save-ok">{message}</span> : null}
          {error ? <span className="admin-marketing-save-err">{error}</span> : null}
        </footer>
      </form>
    </div>
  );
}
