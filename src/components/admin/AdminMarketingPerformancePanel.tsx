"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import AdminMetricCard from "@/components/admin/AdminMetricCard";
import {
  IconCheck,
  IconImport,
  IconOrders,
  IconRevenue,
} from "@/components/admin/AdminMetricIcons";
import AdminPeriodFilter from "@/components/admin/AdminPeriodFilter";
import {
  DASHBOARD_PERIOD_STORAGE_KEY,
  parseStoredDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard-period";
import type { MarketingPerformanceSnapshot } from "@/lib/marketing-performance-shared";

const PERF_PERIOD_KEY = "admin-marketing-perf-period";

function formatEur(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPct(ratio: number | null): string {
  if (ratio == null) return "—";
  return `${Math.round(ratio * 100)}%`;
}

function formatRoas(value: number | null): string {
  if (value == null) return "—";
  return `${value}×`;
}

function formatInt(n: number): string {
  return new Intl.NumberFormat("nl-NL").format(n);
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return <span className={`admin-marketing-pill${ok ? " is-ok" : " is-warn"}`}>{label}</span>;
}

export default function AdminMarketingPerformancePanel() {
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const [data, setData] = useState<MarketingPerformanceSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored =
      localStorage.getItem(PERF_PERIOD_KEY) ?? localStorage.getItem(DASHBOARD_PERIOD_STORAGE_KEY);
    const parsed = parseStoredDashboardPeriod(stored);
    setPeriod(parsed === "all" ? "30d" : parsed);
  }, []);

  const setPeriodFilter = useCallback((next: DashboardPeriod) => {
    setPeriod(next);
    localStorage.setItem(PERF_PERIOD_KEY, next);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/marketing/performance?period=${encodeURIComponent(period)}`,
        { cache: "no-store" },
      );
      const json = (await res.json()) as MarketingPerformanceSnapshot & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Kon performance niet laden");
        return;
      }
      setError("");
      setData(json);
    } catch {
      setError("Netwerkfout");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    void load();
  }, [load]);

  const syncGoogleAds = useCallback(async () => {
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch("/api/admin/marketing/google-ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period }),
      });
      const json = (await res.json()) as { error?: string; ok?: boolean };
      if (!res.ok) {
        setSyncMessage(json.error ?? "Sync mislukt");
        return;
      }
      setSyncMessage("Google Ads gesynchroniseerd.");
      await load();
    } catch {
      setSyncMessage("Netwerkfout bij sync");
    } finally {
      setSyncing(false);
    }
  }, [period, load]);

  const adsSourceLabel =
    data?.ads.source === "google_ads_api"
      ? "Live Google Ads API"
      : data?.ads.source === "manual"
        ? "Handmatige kanaalcijfers"
        : "Geen Ads-data";

  return (
    <section className="admin-dash-section admin-marketing-perf" aria-label="ROAS en ROI">
      <div className="admin-dash-section-head admin-marketing-perf-head">
        <div>
          <p className="admin-dash-kicker">Performance</p>
          <h2 className="admin-dash-section-title admin-m-0">ROAS, ROI &amp; Ads</h2>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Shop-omzet vs. ad spend · ROAS = omzet ÷ spend · ROI = (omzet − spend) ÷ spend
          </p>
        </div>
        <div className="admin-marketing-perf-actions">
          <AdminPeriodFilter value={period} onChange={setPeriodFilter} />
          <button
            type="button"
            className="admin-btn admin-btn-secondary"
            disabled={syncing || !data?.connections.googleAdsApi}
            onClick={() => void syncGoogleAds()}
            title={
              data?.connections.googleAdsApi
                ? "Haal spend op uit Google Ads en sla op bij het Google Ads-kanaal"
                : "Configureer eerst Google Ads API in Instellingen → Pixels"
            }
          >
            {syncing ? "Sync…" : "Sync Google Ads"}
          </button>
        </div>
      </div>

      {error ? <div className="admin-error-box admin-mt-1">{error}</div> : null}
      {syncMessage ? (
        <p className="admin-muted admin-m-0 admin-mt-05" role="status">
          {syncMessage}
        </p>
      ) : null}

      {loading && !data ? (
        <p className="admin-muted admin-mt-1">Laden…</p>
      ) : data ? (
        <>
          <div className="admin-metric-grid-hero admin-mt-1">
            <AdminMetricCard
              hero
              featured
              label="Ad spend"
              value={data.ads.spend > 0 ? formatEur(data.ads.spend) : "—"}
              hint={adsSourceLabel}
              icon={<IconImport />}
              iconTone={data.ads.spend > 0 ? "brand" : "warning"}
              highlight={data.ads.source === "none"}
            />
            <AdminMetricCard
              hero
              label="Shop-omzet"
              value={formatEur(data.shop.revenue)}
              hint={`${data.shop.activeOrdersCount} betaalde orders · ${data.periodLabel}`}
              href="/admin/orders"
              icon={<IconRevenue />}
              iconTone="brand"
            />
            <AdminMetricCard
              hero
              label="ROAS"
              value={formatRoas(data.roas)}
              hint="Shop-omzet ÷ ad spend"
              icon={<IconCheck />}
              iconTone={data.roas != null && data.roas >= 1 ? "success" : "default"}
            />
            <AdminMetricCard
              hero
              label="ROI"
              value={formatPct(data.roi)}
              hint={
                data.profit != null
                  ? `Winst ${formatEur(data.profit)} · (omzet − spend) ÷ spend`
                  : "(omzet − spend) ÷ spend"
              }
              icon={<IconOrders />}
              iconTone={data.roi != null && data.roi >= 0 ? "success" : "warning"}
            />
          </div>

          <div className="admin-metric-grid-wide admin-mt-1">
            <AdminMetricCard
              label="Impressies"
              value={data.ads.impressions > 0 ? formatInt(data.ads.impressions) : "—"}
              hint={data.ads.dateRangeNote ?? adsSourceLabel}
            />
            <AdminMetricCard
              label="Klikken"
              value={data.ads.clicks > 0 ? formatInt(data.ads.clicks) : "—"}
              hint={
                data.ads.impressions > 0
                  ? `CTR ${((data.ads.clicks / data.ads.impressions) * 100).toFixed(2)}%`
                  : "—"
              }
            />
            <AdminMetricCard
              label="Conversies (Ads)"
              value={data.ads.conversions > 0 ? formatInt(Math.round(data.ads.conversions)) : "—"}
              hint={
                data.adsAttributedRoas != null
                  ? `Ads-omzet ${formatEur(data.ads.conversionValue)} · ROAS ${formatRoas(data.adsAttributedRoas)}`
                  : "Conversion value uit Ads"
              }
            />
            <AdminMetricCard
              label="GA4 omzet"
              value={
                data.ga4.source === "ga4_api" ? formatEur(data.ga4.purchaseRevenue) : "—"
              }
              hint={
                data.ga4.source === "ga4_api"
                  ? `${formatInt(data.ga4.sessions)} sessies · ${formatInt(data.ga4.transactions)} tx`
                  : "Koppel GA4 Property ID + OAuth"
              }
            />
          </div>

          {(data.ads.error || data.ga4.error || data.ads.source === "none") && (
            <div className="admin-banner warn admin-mt-1" role="status">
              {data.ads.error ? <p className="admin-m-0">Google Ads: {data.ads.error}</p> : null}
              {data.ga4.error ? <p className="admin-m-0">GA4: {data.ga4.error}</p> : null}
              {data.ads.source === "none" && !data.ads.error ? (
                <p className="admin-m-0">
                  Geen ad spend. Vul{" "}
                  <Link href="/admin/settings/pixels">Instellingen → Pixels</Link> (Google Ads API)
                  of voer handmatig cijfers in bij{" "}
                  <Link href="/admin/marketing/google-ads">Google Ads</Link>.
                </p>
              ) : null}
            </div>
          )}

          <div className="admin-marketing-perf-connections admin-mt-1">
            <StatusPill
              ok={data.connections.googleAdsTag}
              label={data.connections.googleAdsTag ? "Ads-tag (AW-…)" : "Ads-tag ontbreekt"}
            />
            <StatusPill
              ok={data.connections.googleAdsApi}
              label={
                data.connections.googleAdsApi
                  ? "Ads API gekoppeld"
                  : `Ads API: ${data.connections.googleAdsApiMissing.length} velden`
              }
            />
            <StatusPill
              ok={data.connections.ga4Measurement}
              label={data.connections.ga4Measurement ? "GA4 Measurement" : "GA4 Measurement ontbreekt"}
            />
            <StatusPill
              ok={data.connections.ga4Api}
              label={data.connections.ga4Api ? "GA4 Data API" : "GA4 Data API niet klaar"}
            />
            <Link href="/admin/settings/pixels" className="admin-dash-more">
              Pixels / Ads API
            </Link>
            <Link href="/admin/settings/analytics" className="admin-dash-more">
              Analytics / GA4
            </Link>
          </div>
        </>
      ) : null}
    </section>
  );
}
