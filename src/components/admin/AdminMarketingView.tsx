import Link from "next/link";

import AdminMarketingPerformancePanel from "@/components/admin/AdminMarketingPerformancePanel";
import AdminMetricCard from "@/components/admin/AdminMetricCard";
import {
  IconCheck,
  IconClock,
  IconImport,
  IconOrders,
  IconPages,
  IconProducts,
  IconUsers,
} from "@/components/admin/AdminMetricIcons";
import type { MarketingDashboardMetrics } from "@/lib/marketing-metrics";
import {
  WINBACK_CRON_PATH,
  WINBACK_CRON_SCHEDULE,
  WINBACK_CRON_SCHEDULE_LABEL,
} from "@/lib/marketing-winback-cron";

function formatCronRunTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ro-RO", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function IconMail() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="m4 7 8 6 8-6M4 7v10h16V7" strokeLinecap="round" strokeLinejoin="round" />
      <rect x={4} y={5} width={16} height={14} rx={2} />
    </svg>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`admin-marketing-pill${ok ? " is-ok" : " is-warn"}`}>{label}</span>;
}

function DetailRow({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="admin-marketing-detail-row">
      <span className="admin-marketing-detail-label">{label}</span>
      <span
        className={`admin-marketing-detail-value${ok === true ? " is-ok" : ok === false ? " is-warn" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

type Props = {
  data: MarketingDashboardMetrics;
  winBackExpiryDays: string;
};

export default function AdminMarketingView({ data, winBackExpiryDays }: Props) {
  const { stack, tiktok, sla, emailCounts, cron, channelSummaries } = data;
  const cronSecretSet = cron.secretConfigured;
  const lastRun = cron.lastRun;

  return (
    <div className="admin-page admin-marketing">
      <div className="admin-page-head admin-marketing-head">
        <div>
          <h1 className="admin-page-title">Marketing</h1>
          <p className="admin-page-lead">
            Gecombineerd ROAS/ROI-dashboard (Google Ads + shop-omzet), kanalen, e-mail en pixels.
          </p>
        </div>
        <div className="admin-marketing-head-actions">
          <Link href="/admin/settings/pixels" className="admin-btn admin-btn-secondary">
            Ads API instellingen
          </Link>
          <Link href="/admin/one-million-plan" className="admin-btn admin-btn-secondary">
            1 Million Plan
          </Link>
          <Link href="/admin/email" className="admin-btn admin-btn-primary">
            Email previews
          </Link>
        </div>
      </div>

      <AdminMarketingPerformancePanel />

      <section className="admin-dash-section" aria-label="Overview">
        <div className="admin-metric-grid-hero">
          <AdminMetricCard
            hero
            label="E-mail transport"
            value={stack.emailConfigured ? "Active" : "Missing"}
            hint={stack.emailConfigured ? "SMTP or Resend ready" : "Set SMTP_* or RESEND_API_KEY"}
            href="/admin/email"
            icon={<IconMail />}
            iconTone={stack.emailConfigured ? "success" : "warning"}
            highlight={!stack.emailConfigured}
          />
          <AdminMetricCard
            hero
            label="Catalog feed"
            value={tiktok.feedReady ? "Ready" : "Incomplete"}
            hint={`${tiktok.productsWithImage}/${tiktok.productsVisible} with image · ${data.catalogImagePercent}%`}
            icon={<IconProducts />}
            iconTone={tiktok.feedReady ? "success" : "warning"}
            highlight={!tiktok.feedReady}
          />
          <AdminMetricCard
            hero
            label="Paid channels"
            value={`${data.paidChannelsReady}/${data.paidChannelsTotal}`}
            hint="TikTok · Meta · Google Ads · Merchant Center"
            icon={<IconImport />}
            iconTone={data.paidChannelsReady === data.paidChannelsTotal ? "success" : "default"}
          />
          <AdminMetricCard
            hero
            label="Repeat discount"
            value={`${stack.repeatDiscountPercent}%`}
            hint={`Auto at checkout · code ${stack.repeatPromoCode}`}
            icon={<IconCheck />}
            iconTone="brand"
          />
        </div>
      </section>

      <section className="admin-dash-section" aria-label="Channels">
        <div className="admin-dash-section-head">
          <h2 className="admin-dash-section-title">Channels</h2>
          <p className="admin-muted admin-m-0">
            Per channel: spend, campaigns, attributed revenue and ROAS — open a channel for details.
          </p>
        </div>
        <div className="admin-marketing-channel-grid">
          {channelSummaries.map((ch) => (
            <Link key={ch.channel} href={ch.href} className="admin-marketing-channel-card">
              <div className="admin-marketing-channel-card-head">
                <span className="admin-marketing-channel-card-title">{ch.shortLabel}</span>
                <StatusPill
                  ok={ch.envConfigured}
                  label={ch.envConfigured ? "Connected" : "Setup"}
                />
              </div>
              <div className="admin-marketing-channel-card-metrics">
                <span>
                  <strong>{ch.adSpendRon > 0 ? `${ch.adSpendRon.toFixed(0)} RON` : "—"}</strong> spend
                </span>
                <span>
                  <strong>{ch.roas != null ? `${ch.roas}x` : "—"}</strong> ROAS
                </span>
                <span>
                  <strong>{ch.campaignCount}</strong> campaigns
                </span>
              </div>
              {ch.attributedRevenueRon > 0 ? (
                <p className="admin-marketing-channel-card-revenue">
                  {ch.attributedRevenueRon.toFixed(0)} RON attributed
                </p>
              ) : (
                <p className="admin-muted admin-m-0 admin-marketing-channel-card-hint">
                  Add metrics in channel view →
                </p>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section className="admin-dash-section admin-panel admin-marketing-cron-panel" aria-label="Win-back cron">
        <div className="admin-dash-section-head admin-marketing-section-head">
          <h2 className="admin-dash-section-title">Win-back cron (Vercel)</h2>
          <StatusPill
            ok={cronSecretSet}
            label={cronSecretSet ? "CRON_SECRET configured" : "CRON_SECRET missing"}
          />
          {lastRun ? (
            <StatusPill ok={lastRun.ok} label={lastRun.ok ? "Last run OK" : "Last run failed"} />
          ) : null}
        </div>

        <div className="admin-metric-grid-wide">
          <AdminMetricCard
            label="Schedule"
            value="08:00 UTC"
            hint={WINBACK_CRON_SCHEDULE_LABEL}
            icon={<IconClock />}
            iconTone="brand"
          />
          <AdminMetricCard
            label="Last cron run"
            value={
              lastRun ? formatCronRunTime(lastRun.ranAt) : cron.cronLogAvailable ? "Not yet" : "—"
            }
            hint={
              lastRun
                ? `${lastRun.candidates} candidates · ${lastRun.sent} sent`
                : "Visible after first Vercel trigger"
            }
            icon={<IconCheck />}
            iconTone={lastRun?.ok ? "success" : lastRun ? "warning" : "default"}
            highlight={!lastRun}
          />
          <AdminMetricCard label="Endpoint" value="GET" hint={WINBACK_CRON_PATH} icon={<IconImport />} />
          <AdminMetricCard
            label="Vercel cron"
            value={cronSecretSet ? "Secured" : "Open"}
            hint={`${WINBACK_CRON_SCHEDULE} · Bearer header`}
            icon={<IconMail />}
            iconTone={cronSecretSet ? "success" : "warning"}
            highlight={!cronSecretSet}
          />
        </div>

        <div className="admin-marketing-detail">
          <DetailRow
            label="Production URL"
            value={`${(process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.bergasports.com").replace(/\/$/, "")}${WINBACK_CRON_PATH}`}
          />
          <DetailRow label="CRON_SECRET" value={cronSecretSet ? "Set (Production)" : "Not set"} ok={cronSecretSet} />
          <DetailRow
            label="Last run result"
            value={
              lastRun
                ? `${lastRun.sent} emails sent · ${lastRun.candidates} eligible`
                : "Waiting for first scheduled or manual run"
            }
            ok={lastRun?.ok}
          />
          {lastRun?.detail ? <DetailRow label="Detail" value={lastRun.detail} ok={false} /> : null}
          <DetailRow
            label="Localhost admin"
            value="Pull CRON_SECRET: npx vercel env pull .env.local"
            ok={cronSecretSet}
          />
        </div>
      </section>

      <div className="admin-marketing-columns">
        <section className="admin-dash-section admin-panel" aria-label="E-mail flows">
          <div className="admin-dash-section-head admin-marketing-section-head">
            <h2 className="admin-dash-section-title">E-mail flows (RO)</h2>
            <StatusPill
              ok={stack.emailConfigured}
              label={stack.emailConfigured ? "Sending enabled" : "Not configured"}
            />
          </div>

          <div className="admin-metric-grid-wide">
            <AdminMetricCard
              label="Welcome sent"
              value={emailCounts.logAvailable ? emailCounts.welcome : "—"}
              hint="First order + marketing consent"
              icon={<IconMail />}
            />
            <AdminMetricCard
              label="Post-purchase"
              value={emailCounts.logAvailable ? emailCounts.postPurchase : "—"}
              hint="After status delivered"
              icon={<IconCheck />}
              iconTone="success"
            />
            <AdminMetricCard
              label="Win-back sent"
              value={emailCounts.logAvailable ? emailCounts.winBack : "—"}
              hint={`Code ${stack.winBackCode} · cron 08:00 UTC`}
              icon={<IconUsers />}
            />
            <AdminMetricCard
              label="Win-back queue"
              value={data.winBackCandidates}
              hint="Inactive 60+ days · eligible now"
              icon={<IconClock />}
              iconTone={data.winBackCandidates > 0 ? "warning" : "default"}
              highlight={data.winBackCandidates > 0}
            />
          </div>

          <div className="admin-marketing-detail">
            <DetailRow label="Welcome trigger" value="Prima comandă + e-mail + consent checkout" />
            <DetailRow label="Post-purchase" value="Status livrată + marketing_consent" />
            <DetailRow label="Win-back cron" value="GET /api/cron/marketing-winback" ok={cronSecretSet} />
            <DetailRow
              label="CRON_SECRET"
              value={cronSecretSet ? "Set on server" : "Not set — required in production"}
              ok={cronSecretSet}
            />
          </div>
        </section>

        <section className="admin-dash-section admin-panel" aria-label="TikTok catalog">
          <div className="admin-dash-section-head admin-marketing-section-head">
            <h2 className="admin-dash-section-title">TikTok & catalog</h2>
            <StatusPill ok={tiktok.pixel.ok} label={tiktok.pixel.label} />
          </div>

          <div className="admin-metric-grid-wide">
            <AdminMetricCard
              label="Visible products"
              value={tiktok.productsVisible}
              hint="Published in shop"
              href="/admin/products"
              icon={<IconProducts />}
              iconTone="brand"
            />
            <AdminMetricCard
              label="With image"
              value={`${data.catalogImagePercent}%`}
              hint={`${tiktok.productsWithImage} of ${tiktok.productsVisible}`}
              icon={<IconCheck />}
              iconTone={data.catalogImagePercent >= 95 ? "success" : "warning"}
            />
            <AdminMetricCard
              label="In stock"
              value={`${data.catalogStockPercent}%`}
              hint={`${tiktok.productsInStock} flagged in stock`}
              icon={<IconProducts />}
            />
            <AdminMetricCard
              label="Events API"
              value={tiktok.pixel.eventsApiConfigured ? "On" : "Off"}
              hint={tiktok.pixel.secondaryLabel ?? "Server-side Purchase"}
              icon={<IconImport />}
              iconTone={tiktok.pixel.eventsApiConfigured ? "success" : "warning"}
            />
          </div>

          {tiktok.notes.length ? (
            <ul className="admin-marketing-notes">
              {tiktok.notes.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <div className="admin-marketing-columns">
        <section className="admin-dash-section admin-panel" aria-label="Paid acquisition">
          <div className="admin-dash-section-head">
            <h2 className="admin-dash-section-title">Paid acquisition</h2>
            <p className="admin-muted admin-m-0">Env readiness — TikTok, Meta, Google pixels · Merchant Center</p>
          </div>

          <div className="admin-metric-grid">
            <AdminMetricCard
              label="TikTok Pixel"
              value={tiktok.pixel.pixelConfigured ? "Configured" : "Missing"}
              hint="NEXT_PUBLIC_TIKTOK_PIXEL_ID"
              href="/admin/marketing/tiktok"
              icon={<IconImport />}
              iconTone={tiktok.pixel.pixelConfigured ? "success" : "warning"}
              highlight={!tiktok.pixel.pixelConfigured}
            />
            <AdminMetricCard
              label="Meta Pixel"
              value={stack.metaPixelId ? "Configured" : "Missing"}
              hint="NEXT_PUBLIC_META_PIXEL_ID"
              href="/admin/marketing/meta"
              icon={<IconCheck />}
              iconTone={stack.metaPixelId ? "success" : "warning"}
              highlight={!stack.metaPixelId}
            />
            <AdminMetricCard
              label="Google Ads"
              value={stack.googleAdsId ? "Configured" : "Missing"}
              hint="NEXT_PUBLIC_GOOGLE_ADS_ID"
              href="/admin/marketing/google-ads"
              icon={<IconCheck />}
              iconTone={stack.googleAdsId ? "success" : "warning"}
              highlight={!stack.googleAdsId}
            />
            <AdminMetricCard
              label="Merchant Center"
              value={stack.googleMerchantCenter ? "Configured" : "Missing"}
              hint="GOOGLE_MERCHANT_CENTER_ID"
              href="/admin/marketing/google-merchant"
              icon={<IconPages />}
              iconTone={stack.googleMerchantCenter ? "success" : "warning"}
              highlight={!stack.googleMerchantCenter}
            />
          </div>
        </section>

        <section className="admin-dash-section admin-panel" aria-label="Operations">
          <div className="admin-dash-section-head">
            <h2 className="admin-dash-section-title">Operations & retention</h2>
          </div>

          <div className="admin-metric-grid-wide">
            <AdminMetricCard
              label="Pending SLA"
              value={sla.pendingOlderThan24h}
              hint={`${sla.pendingTotal} pending total · target under 24h`}
              href="/admin/orders?status=pending"
              icon={<IconClock />}
              iconTone="warning"
              highlight={sla.pendingOlderThan24h > 0}
              badge={sla.pendingOlderThan24h > 0 ? "Action needed" : undefined}
            />
            <AdminMetricCard
              label="Win-back code"
              value={stack.winBackCode}
              hint={`Expiry +${winBackExpiryDays} days`}
              icon={<IconMail />}
            />
            <AdminMetricCard
              label="Repeat promo"
              value={stack.repeatPromoCode}
              hint={`${stack.repeatDiscountPercent}% off subtotal · returning phone`}
              icon={<IconOrders />}
              iconTone="brand"
            />
          </div>

          <div className="admin-marketing-detail">
            <DetailRow label="Repeat logic" value="Same phone · prior non-cancelled order" ok />
            <DetailRow
              label="Order SLA"
              value={sla.pendingOlderThan24h === 0 ? "On track" : `${sla.pendingOlderThan24h} overdue`}
              ok={sla.pendingOlderThan24h === 0}
            />
            <DetailRow
              label="Status emails"
              value="confirmed → shipped → delivered (RO)"
              ok={stack.emailConfigured}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
