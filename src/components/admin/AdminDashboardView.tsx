"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import AdminMetricCard from "@/components/admin/AdminMetricCard";
import {
  IconCheck,
  IconClock,
  IconImport,
  IconOrders,
  IconPages,
  IconProducts,
  IconRevenue,
  IconUsers,
} from "@/components/admin/AdminMetricIcons";
import {
  aggregateEasySalesOrders,
  aggregateShopOrders,
  countAllShopPending,
  type EasySalesDashboardOrder,
  type ShopDashboardOrder,
} from "@/lib/dashboard-aggregates";
import {
  DASHBOARD_CURRENCY_STORAGE_KEY,
  formatDashboardMoney,
  parseStoredDashboardCurrency,
  type DashboardDisplayCurrency,
} from "@/lib/dashboard-currency";
import AdminPeriodFilter from "@/components/admin/AdminPeriodFilter";
import {
  DASHBOARD_PERIOD_STORAGE_KEY,
  getDashboardPeriodLabel,
  parseStoredDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard-period";

const ORDER_PIPELINE = [
  { key: "pending", label: "Pending", status: "pending" },
  { key: "confirmed", label: "Confirmed", status: "confirmed" },
  { key: "processing", label: "Processing", status: "processing" },
  { key: "shipped", label: "Shipped", status: "shipped" },
  { key: "delivered", label: "Delivered", status: "delivered" },
  { key: "cancelled", label: "Cancelled", status: "cancelled" },
] as const;

export type AdminDashboardViewProps = {
  superAdmin: boolean;
  writable: boolean;
  ronPerEur: number;
  shopOrders: ShopDashboardOrder[];
  easySalesOrders: EasySalesDashboardOrder[];
  easySalesReady: boolean;
  productsCount: number;
  categoriesCount: number;
  pagesPublished: number;
  pagesTotal: number;
};

function CurrencySwitcher({
  value,
  onChange,
  ronPerEur,
}: {
  value: DashboardDisplayCurrency;
  onChange: (next: DashboardDisplayCurrency) => void;
  ronPerEur: number;
}) {
  return (
    <div className="admin-currency-switcher" role="group" aria-label="Display currency">
      {(["RON", "EUR"] as const).map((code) => (
        <button
          key={code}
          type="button"
          className={`admin-currency-switcher-btn${value === code ? " is-active" : ""}`}
          aria-pressed={value === code}
          onClick={() => onChange(code)}
        >
          {code}
        </button>
      ))}
      <span className="admin-currency-switcher-rate" title="Exchange rate for indicative EUR display">
        1 EUR = {ronPerEur.toFixed(2)} RON
      </span>
    </div>
  );
}

export default function AdminDashboardView(props: AdminDashboardViewProps) {
  const {
    superAdmin,
    writable,
    ronPerEur,
    shopOrders,
    easySalesOrders,
    easySalesReady,
    productsCount,
    categoriesCount,
    pagesPublished,
    pagesTotal,
  } = props;

  const [displayCurrency, setDisplayCurrency] = useState<DashboardDisplayCurrency>("RON");
  const [period, setPeriod] = useState<DashboardPeriod>("all");

  useEffect(() => {
    setDisplayCurrency(parseStoredDashboardCurrency(localStorage.getItem(DASHBOARD_CURRENCY_STORAGE_KEY)));
    setPeriod(parseStoredDashboardPeriod(localStorage.getItem(DASHBOARD_PERIOD_STORAGE_KEY)));
  }, []);

  const setCurrency = useCallback((next: DashboardDisplayCurrency) => {
    setDisplayCurrency(next);
    localStorage.setItem(DASHBOARD_CURRENCY_STORAGE_KEY, next);
  }, []);

  const setPeriodFilter = useCallback((next: DashboardPeriod) => {
    setPeriod(next);
    localStorage.setItem(DASHBOARD_PERIOD_STORAGE_KEY, next);
  }, []);

  const shopMetrics = useMemo(() => aggregateShopOrders(shopOrders, period), [shopOrders, period]);
  const easySalesMetrics = useMemo(
    () => aggregateEasySalesOrders(easySalesOrders, period),
    [easySalesOrders, period],
  );
  const sales = superAdmin && easySalesReady ? easySalesMetrics : shopMetrics;
  const periodLabel = getDashboardPeriodLabel(period);
  const pendingAllTime = useMemo(() => countAllShopPending(shopOrders), [shopOrders]);
  const shopInPeriod = useMemo(() => aggregateShopOrders(shopOrders, period), [shopOrders, period]);

  const easySalesStatuses = useMemo(
    () => Object.entries(easySalesMetrics.statusCounts).sort((a, b) => b[1] - a[1]),
    [easySalesMetrics.statusCounts],
  );
  const easySalesMarketplaces = useMemo(
    () => Object.entries(easySalesMetrics.marketplaceCounts).sort((a, b) => b[1] - a[1]),
    [easySalesMetrics.marketplaceCounts],
  );

  const money = useCallback(
    (amountRon: number) => formatDashboardMoney(amountRon, displayCurrency, ronPerEur),
    [displayCurrency, ronPerEur],
  );

  const eurHint = displayCurrency === "EUR" ? "Indicative conversion from RON" : undefined;
  const periodHint = periodLabel;

  return (
    <div className="admin-dashboard">
      <header className="admin-dash-header">
        <div>
          <h1 className="admin-dash-title">Welcome back</h1>
          <p className="admin-dash-subtitle">
            {superAdmin
              ? "Sales via Easy Sales; shop operations below."
              : "Overview of your webshop."}
          </p>
        </div>
        <div className="admin-dash-header-actions">
          <AdminPeriodFilter value={period} onChange={setPeriodFilter} />
          <CurrencySwitcher value={displayCurrency} onChange={setCurrency} ronPerEur={ronPerEur} />
          {!writable ? (
            <div className="admin-banner warn admin-m-0" role="status">
              <strong>Read-only.</strong> Add <code>DATABASE_URL</code> to enable editing.
            </div>
          ) : (
            <div className="admin-banner ok admin-m-0" role="status">
              Live sync with <strong>Prisma Postgres</strong> — changes are visible in the shop immediately.
            </div>
          )}
        </div>
      </header>

      <div className="admin-banner admin-m-0" style={{ background: "#faf8f5", borderColor: "#e0d4ef", color: "#3d2654" }}>
        <strong>1 Million Plan</strong> — roadmap to 1M RON in shop sales.{" "}
        <Link href="/admin/one-million-plan" className="admin-one-million-link">
          Open plan →
        </Link>
      </div>

      <section className="admin-dash-section" aria-label="Primary metrics">
        <div className="admin-metric-grid-hero">
          <AdminMetricCard
            hero
            label={superAdmin ? "Revenue (Easy Sales)" : "Revenue"}
            value={money(sales.revenue)}
            hint={
              eurHint ??
              (superAdmin
                ? easySalesReady
                  ? `${periodHint} · all channels`
                  : "Easy Sales not configured"
                : `${periodHint} · excl. cancelled`)
            }
            icon={<IconRevenue />}
            iconTone="brand"
          />
          <AdminMetricCard
            hero
            label={superAdmin ? "Orders (Easy Sales)" : "Orders"}
            value={sales.ordersCount}
            hint={periodHint}
            href={superAdmin ? "/admin/easy-sales-orders" : "/admin/orders"}
            icon={<IconOrders />}
            iconTone="brand"
            highlight={!superAdmin && pendingAllTime > 0}
            badge={!superAdmin && pendingAllTime > 0 ? `${pendingAllTime} pending` : undefined}
          />
          <AdminMetricCard
            hero
            label="Products"
            value={productsCount}
            hint="In catalog"
            href="/admin/products"
            icon={<IconProducts />}
            iconTone="brand"
          />
          <AdminMetricCard
            hero
            label="Customers"
            value={sales.customersCount}
            hint={superAdmin ? `Unique · ${periodHint}` : `Unique buyers · ${periodHint}`}
            href={superAdmin ? undefined : "/admin/customers"}
            icon={<IconUsers />}
            iconTone="brand"
          />
        </div>
      </section>

      <div className="admin-dash-split">
        <div className="admin-dash-section">
          <div className="admin-dash-section-head">
            <h2 className="admin-dash-section-title">Operations</h2>
            <p className="admin-muted admin-m-0">{periodHint}</p>
          </div>
          <div className="admin-metric-grid-wide">
            <AdminMetricCard
              label="Pending orders"
              value={shopInPeriod.statusCounts.pending ?? 0}
              hint={superAdmin ? "Shop · in period" : "Needs attention"}
              href="/admin/orders?status=pending"
              icon={<IconClock />}
              iconTone="warning"
              highlight={(shopInPeriod.statusCounts.pending ?? 0) > 0}
            />
            <AdminMetricCard
              label="In progress"
              value={
                (shopInPeriod.statusCounts.confirmed ?? 0) +
                (shopInPeriod.statusCounts.processing ?? 0) +
                (shopInPeriod.statusCounts.shipped ?? 0)
              }
              hint="Shop · confirmed · processing · shipped"
              href="/admin/orders?status=processing"
              icon={<IconOrders />}
            />
            <AdminMetricCard
              label="Delivered"
              value={shopInPeriod.statusCounts.delivered ?? 0}
              hint="Shop · completed"
              href="/admin/orders?status=delivered"
              icon={<IconCheck />}
              iconTone="success"
            />
            <AdminMetricCard
              label={superAdmin ? "Avg. order (Easy Sales)" : "Average order"}
              value={money(sales.avgOrder)}
              hint={eurHint ?? `${periodHint} · excl. cancelled`}
              icon={<IconRevenue />}
            />
            {superAdmin ? (
              <AdminMetricCard
                label="Shop orders"
                value={shopInPeriod.ordersCount}
                hint={`${periodHint} · bergasports.com`}
                href="/admin/orders"
                icon={<IconOrders />}
              />
            ) : null}
            <AdminMetricCard
              label="Import categories"
              value={categoriesCount}
              hint="Ralex source"
              href="/admin/import"
              icon={<IconImport />}
            />
            <AdminMetricCard
              label="CMS pages"
              value={pagesPublished}
              hint={`${pagesPublished} of ${pagesTotal} published`}
              href="/admin/pages"
              icon={<IconPages />}
            />
            {(shopInPeriod.statusCounts.cancelled ?? 0) > 0 ? (
              <AdminMetricCard
                label="Cancelled"
                value={shopInPeriod.statusCounts.cancelled ?? 0}
                hint={`Shop · ${periodHint}`}
                href="/admin/orders?status=cancelled"
              />
            ) : null}
          </div>
        </div>

        <aside className="admin-dash-section">
          <div className="admin-panel admin-stack-tight">
            <h2 className="admin-panel-title admin-m-0">
              {superAdmin ? "Easy Sales statuses" : "Order pipeline"}
            </h2>
            <p className="admin-muted admin-m-0">{periodHint}</p>
            <div className="admin-order-pipeline admin-mt-05">
              {superAdmin
                ? easySalesStatuses.map(([status, count]) => (
                    <div key={status} className="admin-order-pipeline-row">
                      <span className="admin-order-pipeline-label">{status}</span>
                      <span className="admin-order-pipeline-value">{count}</span>
                    </div>
                  ))
                : ORDER_PIPELINE.map((row) => {
                    const count = shopInPeriod.statusCounts[row.status] ?? 0;
                    if (row.status === "cancelled" && count === 0) {
                      return null;
                    }
                    return (
                      <Link
                        key={row.key}
                        href={`/admin/orders?status=${row.status}`}
                        className="admin-order-pipeline-row"
                      >
                        <span className="admin-order-pipeline-label">{row.label}</span>
                        <span className="admin-order-pipeline-value">{count}</span>
                      </Link>
                    );
                  })}
            </div>
            {superAdmin && easySalesMarketplaces.length > 0 ? (
              <>
                <h3 className="admin-panel-title admin-m-0 admin-mt-1">Channels</h3>
                <div className="admin-order-pipeline">
                  {easySalesMarketplaces.map(([name, count]) => (
                    <div key={name} className="admin-order-pipeline-row">
                      <span className="admin-order-pipeline-label">{name}</span>
                      <span className="admin-order-pipeline-value">{count}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
          </div>

          <div className="admin-panel admin-stack-tight">
            <h2 className="admin-panel-title admin-m-0">Quick links</h2>
            <p className="admin-muted admin-m-0">Common tasks</p>
            <div className="admin-quick-links-grid admin-mt-05">
              <Link href="/admin/products" className="admin-quick-link">
                <span className="admin-quick-link-title">Products</span>
                <span className="admin-quick-link-desc">Catalog &amp; pricing</span>
              </Link>
              <Link href="/admin/import" className="admin-quick-link">
                <span className="admin-quick-link-title">Import</span>
                <span className="admin-quick-link-desc">Pull from external shops</span>
              </Link>
              <Link href="/admin/orders" className="admin-quick-link">
                <span className="admin-quick-link-title">Orders</span>
                <span className="admin-quick-link-desc">
                  {pendingAllTime > 0 ? `${pendingAllTime} pending` : "All orders"}
                </span>
              </Link>
              <Link href="/admin/customers" className="admin-quick-link">
                <span className="admin-quick-link-title">Customers</span>
                <span className="admin-quick-link-desc">Purchase history</span>
              </Link>
              <Link href="/admin/pages" className="admin-quick-link">
                <span className="admin-quick-link-title">Pages</span>
                <span className="admin-quick-link-desc">Homepage &amp; legal</span>
              </Link>
              <Link href="/" className="admin-quick-link">
                <span className="admin-quick-link-title">View shop</span>
                <span className="admin-quick-link-desc">Open storefront</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
