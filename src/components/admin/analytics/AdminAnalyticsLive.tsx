"use client";

import { useCallback, useEffect, useState } from "react";

import AdminLiveGlobe from "@/components/admin/analytics/AdminLiveGlobe";
import AdminPeriodFilter from "@/components/admin/AdminPeriodFilter";
import type { AnalyticsLiveSnapshot } from "@/lib/analytics-live-types";
import {
  DASHBOARD_PERIOD_STORAGE_KEY,
  getDashboardPeriodLabel,
  parseStoredDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard-period";

const POLL_MS = 4000;

function formatPathLabel(path: string): string {
  if (path === "/") return "Home";
  if (path.startsWith("/product/")) return `Product ${path.split("/")[2] ?? ""}`;
  if (path.startsWith("/shop")) return "Shop";
  return path;
}

function maxViews(data: { views: number }[]): number {
  return Math.max(1, ...data.map((d) => d.views));
}

function formatConversionRate(rate: number | null | undefined): string {
  if (rate == null || !Number.isFinite(rate)) {
    return "—";
  }
  return `${rate.toFixed(1)}%`;
}

export default function AdminAnalyticsLive() {
  const [period, setPeriod] = useState<DashboardPeriod>("all");
  const [data, setData] = useState<AnalyticsLiveSnapshot | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPeriod(parseStoredDashboardPeriod(localStorage.getItem(DASHBOARD_PERIOD_STORAGE_KEY)));
  }, []);

  const setPeriodFilter = useCallback((next: DashboardPeriod) => {
    setPeriod(next);
    localStorage.setItem(DASHBOARD_PERIOD_STORAGE_KEY, next);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/analytics/live?period=${encodeURIComponent(period)}`, {
        cache: "no-store",
      });
      const json = (await res.json()) as AnalyticsLiveSnapshot & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "Could not load analytics");
        return;
      }
      setError("");
      setData(json);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const periodLabel = data?.periodLabel ?? getDashboardPeriodLabel(period);

  const updatedLabel = data?.generatedAt
    ? new Date(data.generatedAt).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "—";

  const chartMax = maxViews(data?.pageViewsLast10Min ?? []);

  return (
    <div className="admin-live-view admin-live-view--immersive">
      <header className="admin-live-view-head">
        <div>
          <h1 className="admin-live-view-title">Live view</h1>
          <p className="admin-live-view-sub admin-m-0">
            Real-time map · metrics for {periodLabel.toLowerCase()} · refresh {updatedLabel}
          </p>
        </div>
        <div className="admin-live-view-head-actions">
          <AdminPeriodFilter value={period} onChange={setPeriodFilter} />
          <div className="admin-live-view-legend-row" aria-hidden>
            <span className="admin-live-globe-legend-item">
              <span className="admin-live-globe-dot admin-live-globe-dot--visitor" />
              Visitor
            </span>
          </div>
        </div>
      </header>

      {error ? <div className="admin-error-box">{error}</div> : null}

      <div className="admin-live-hero">
        <section className="admin-live-globe-section" aria-label="Live visitor map">
          <AdminLiveGlobe visitors={data?.visitors ?? []} />
          {loading && !data ? (
            <p className="admin-live-globe-loading">Loading live map…</p>
          ) : null}
          {!loading && data && data.visitorsNow === 0 ? (
            <p className="admin-live-globe-empty">
              No active visitors right now. Open the shop in another tab to test.
            </p>
          ) : null}
        </section>

        <section className="admin-live-metrics" aria-label="Live metrics">
          <div className="admin-live-metric-card admin-live-metric-card--hero">
            <p className="admin-live-metric-label">Vizitatori acum</p>
            <p className="admin-live-metric-value">{data?.visitorsNow ?? (loading ? "…" : 0)}</p>
            <p className="admin-live-metric-hint">Live</p>
          </div>
          <div className="admin-live-metric-card">
            <p className="admin-live-metric-label">Sessions</p>
            <p className="admin-live-metric-value">{data?.sessions ?? (loading ? "…" : 0)}</p>
            <p className="admin-live-metric-hint">{periodLabel}</p>
          </div>
          <div className="admin-live-metric-card">
            <p className="admin-live-metric-label">Page views</p>
            <p className="admin-live-metric-value">{data?.pageViews ?? (loading ? "…" : 0)}</p>
            <p className="admin-live-metric-hint">{periodLabel}</p>
          </div>
          <div className="admin-live-metric-card">
            <p className="admin-live-metric-label">Orders</p>
            <p className="admin-live-metric-value">{data?.orders ?? (loading ? "…" : 0)}</p>
            <p className="admin-live-metric-hint">{periodLabel}</p>
          </div>
          <div className="admin-live-metric-card admin-live-metric-card--funnel">
            <p className="admin-live-metric-label">Active carts</p>
            <p className="admin-live-metric-value">{data?.activeCartsNow ?? (loading ? "…" : 0)}</p>
            <p className="admin-live-metric-hint">Live · items in cart</p>
          </div>
          <div className="admin-live-metric-card admin-live-metric-card--funnel">
            <p className="admin-live-metric-label">Checkout</p>
            <p className="admin-live-metric-value">{data?.checkoutNow ?? (loading ? "…" : 0)}</p>
            <p className="admin-live-metric-hint">Live · form open</p>
          </div>
          <div className="admin-live-metric-card admin-live-metric-card--funnel">
            <p className="admin-live-metric-label">Conversion rate</p>
            <p className="admin-live-metric-value">{formatConversionRate(data?.conversionRate)}</p>
            <p className="admin-live-metric-hint">
              {periodLabel} · {data?.orders ?? 0} orders / {data?.sessions ?? 0} sessions
            </p>
          </div>
        </section>
      </div>

      <div className="admin-live-panels">
        <section className="admin-panel admin-live-panel" aria-label="Page views last 10 minutes">
          <h2 className="admin-panel-title admin-m-0">Page views</h2>
          <p className="admin-muted admin-m-0 admin-mt-05">Live · last 10 minutes</p>
          <div className="admin-live-chart" role="img" aria-label="Page views per minute">
            {(data?.pageViewsLast10Min ?? []).map((bucket) => (
              <div key={bucket.minute} className="admin-live-chart-col">
                <div
                  className="admin-live-chart-bar"
                  style={{ height: `${Math.max(8, (bucket.views / chartMax) * 100)}%` }}
                  title={`${bucket.views} views`}
                />
                <span className="admin-live-chart-label">{bucket.minute}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-panel admin-live-panel" aria-label="Top pages">
          <h2 className="admin-panel-title admin-m-0">Top pages</h2>
          <p className="admin-muted admin-m-0 admin-mt-05">{periodLabel}</p>
          <ul className="admin-live-list admin-m-0 admin-mt-1">
            {(data?.topPages ?? []).length === 0 ? (
              <li className="admin-muted">No data yet</li>
            ) : (
              data?.topPages.map((row) => (
                <li key={row.path} className="admin-live-list-row">
                  <span className="admin-live-list-label">{formatPathLabel(row.path)}</span>
                  <span className="admin-live-list-bar-wrap">
                    <span
                      className="admin-live-list-bar"
                      style={{ width: `${(row.views / maxViews(data?.topPages ?? [])) * 100}%` }}
                    />
                  </span>
                  <span className="admin-live-list-value">{row.views}</span>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="admin-panel admin-live-panel" aria-label="Popular products">
          <h2 className="admin-panel-title admin-m-0">Popular products</h2>
          <p className="admin-muted admin-m-0 admin-mt-05">Product page views · {periodLabel}</p>
          <ul className="admin-live-list admin-m-0 admin-mt-1">
            {(data?.topProducts ?? []).length === 0 ? (
              <li className="admin-muted">No product views yet</li>
            ) : (
              data?.topProducts.map((row) => (
                <li key={row.productId} className="admin-live-list-row">
                  <span className="admin-live-list-label" title={row.name ?? undefined}>
                    {row.name ?? `Product #${row.productId}`}
                  </span>
                  <span className="admin-live-list-bar-wrap">
                    <span
                      className="admin-live-list-bar admin-live-list-bar--product"
                      style={{
                        width: `${(row.views / maxViews(data?.topProducts ?? [])) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="admin-live-list-value">{row.views}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
