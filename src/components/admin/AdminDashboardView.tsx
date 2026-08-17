"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import AdminMetricCard from "@/components/admin/AdminMetricCard";
import {
  IconCheck,
  IconClock,
  IconOrders,
  IconPages,
  IconProducts,
  IconRevenue,
  IconUsers,
} from "@/components/admin/AdminMetricIcons";
import AdminPeriodFilter from "@/components/admin/AdminPeriodFilter";
import {
  aggregateShopOrders,
  countAllShopPending,
  type ShopDashboardOrder,
} from "@/lib/dashboard-aggregates";
import {
  DASHBOARD_PERIOD_STORAGE_KEY,
  getDashboardPeriodLabel,
  parseStoredDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard-period";

const ORDER_PIPELINE = [
  { key: "awaiting_payment", label: "Wacht op betaling", status: "awaiting_payment" },
  { key: "pending", label: "In afwachting", status: "pending" },
  { key: "confirmed", label: "Bevestigd", status: "confirmed" },
  { key: "processing", label: "In behandeling", status: "processing" },
  { key: "shipped", label: "Verzonden", status: "shipped" },
  { key: "delivered", label: "Afgeleverd", status: "delivered" },
  { key: "cancelled", label: "Geannuleerd", status: "cancelled" },
] as const;

function formatEur(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

export type AdminDashboardViewProps = {
  writable: boolean;
  shopOrders: ShopDashboardOrder[];
  productsCount: number;
  pagesPublished: number;
  pagesTotal: number;
};

export default function AdminDashboardView(props: AdminDashboardViewProps) {
  const { writable, shopOrders, productsCount, pagesPublished, pagesTotal } = props;

  const [period, setPeriod] = useState<DashboardPeriod>("all");

  useEffect(() => {
    setPeriod(parseStoredDashboardPeriod(localStorage.getItem(DASHBOARD_PERIOD_STORAGE_KEY)));
  }, []);

  const setPeriodFilter = useCallback((next: DashboardPeriod) => {
    setPeriod(next);
    localStorage.setItem(DASHBOARD_PERIOD_STORAGE_KEY, next);
  }, []);

  const shopInPeriod = useMemo(() => aggregateShopOrders(shopOrders, period), [shopOrders, period]);
  const periodLabel = getDashboardPeriodLabel(period);
  const pendingAllTime = useMemo(() => countAllShopPending(shopOrders), [shopOrders]);

  return (
    <div className="admin-dashboard">
      <header className="admin-dash-header">
        <div>
          <h1 className="admin-dash-title">Dashboard</h1>
          <p className="admin-dash-subtitle">Overzicht van je Bergasports-webshop.</p>
        </div>
        <div className="admin-dash-header-actions">
          <AdminPeriodFilter value={period} onChange={setPeriodFilter} />
          {!writable ? (
            <div className="admin-banner warn admin-m-0" role="status">
              <strong>Alleen-lezen.</strong> Zet <code>DATABASE_URL</code> om te bewerken.
            </div>
          ) : (
            <div className="admin-banner ok admin-m-0" role="status">
              Verbonden met <strong>Prisma Postgres</strong>.
            </div>
          )}
        </div>
      </header>

      <section className="admin-dash-section" aria-label="Kerncijfers">
        <div className="admin-metric-grid-hero">
          <AdminMetricCard
            hero
            label="Omzet"
            value={formatEur(shopInPeriod.revenue)}
            hint={`${periodLabel} · excl. geannuleerd`}
            icon={<IconRevenue />}
            iconTone="brand"
          />
          <AdminMetricCard
            hero
            label="Bestellingen"
            value={shopInPeriod.ordersCount}
            hint={periodLabel}
            href="/admin/orders"
            icon={<IconOrders />}
            iconTone="brand"
            highlight={pendingAllTime > 0}
            badge={pendingAllTime > 0 ? `${pendingAllTime} open` : undefined}
          />
          <AdminMetricCard
            hero
            label="Producten"
            value={productsCount}
            hint="In catalogus"
            href="/admin/products"
            icon={<IconProducts />}
            iconTone="brand"
          />
          <AdminMetricCard
            hero
            label="Klanten"
            value={shopInPeriod.customersCount}
            hint={`Unieke kopers · ${periodLabel}`}
            icon={<IconUsers />}
            iconTone="brand"
          />
        </div>
      </section>

      <div className="admin-dash-split">
        <div className="admin-dash-section">
          <div className="admin-dash-section-head">
            <h2 className="admin-dash-section-title">Operatie</h2>
            <p className="admin-muted admin-m-0">{periodLabel}</p>
          </div>
          <div className="admin-metric-grid-wide">
            <AdminMetricCard
              label="Open bestellingen"
              value={shopInPeriod.statusCounts.pending ?? 0}
              hint="Nog op te pakken"
              href="/admin/orders?status=pending"
              icon={<IconClock />}
              iconTone="warning"
              highlight={(shopInPeriod.statusCounts.pending ?? 0) > 0}
            />
            <AdminMetricCard
              label="In behandeling"
              value={
                (shopInPeriod.statusCounts.confirmed ?? 0) +
                (shopInPeriod.statusCounts.processing ?? 0) +
                (shopInPeriod.statusCounts.shipped ?? 0)
              }
              hint="Bevestigd · verwerken · verzonden"
              href="/admin/orders?status=processing"
              icon={<IconOrders />}
            />
            <AdminMetricCard
              label="Afgeleverd"
              value={shopInPeriod.statusCounts.delivered ?? 0}
              hint="Afgerond"
              href="/admin/orders?status=delivered"
              icon={<IconCheck />}
              iconTone="success"
            />
            <AdminMetricCard
              label="Gem. orderwaarde"
              value={formatEur(shopInPeriod.avgOrder)}
              hint={`${periodLabel} · excl. geannuleerd`}
              icon={<IconRevenue />}
            />
            <AdminMetricCard
              label="Pagina's"
              value={pagesPublished}
              hint={`${pagesPublished} van ${pagesTotal} gepubliceerd`}
              href="/admin/pages"
              icon={<IconPages />}
            />
            {(shopInPeriod.statusCounts.cancelled ?? 0) > 0 ? (
              <AdminMetricCard
                label="Geannuleerd"
                value={shopInPeriod.statusCounts.cancelled ?? 0}
                hint={periodLabel}
                href="/admin/orders?status=cancelled"
              />
            ) : null}
          </div>
        </div>

        <aside className="admin-dash-section">
          <div className="admin-panel admin-stack-tight">
            <h2 className="admin-panel-title admin-m-0">Orderpipeline</h2>
            <p className="admin-muted admin-m-0">{periodLabel}</p>
            <div className="admin-order-pipeline admin-mt-05">
              {ORDER_PIPELINE.map((row) => {
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
          </div>

          <div className="admin-panel admin-stack-tight">
            <h2 className="admin-panel-title admin-m-0">Snelkoppelingen</h2>
            <div className="admin-quick-links-grid admin-mt-05">
              <Link href="/admin/products" className="admin-quick-link">
                <span className="admin-quick-link-title">Producten</span>
                <span className="admin-quick-link-desc">Catalogus &amp; prijzen</span>
              </Link>
              <Link href="/admin/orders" className="admin-quick-link">
                <span className="admin-quick-link-title">Bestellingen</span>
                <span className="admin-quick-link-desc">
                  {pendingAllTime > 0 ? `${pendingAllTime} open` : "Alle bestellingen"}
                </span>
              </Link>
              <Link href="/admin/pages" className="admin-quick-link">
                <span className="admin-quick-link-title">Pagina&apos;s</span>
                <span className="admin-quick-link-desc">Home &amp; content</span>
              </Link>
              <Link href="/" className="admin-quick-link">
                <span className="admin-quick-link-title">Shop</span>
                <span className="admin-quick-link-desc">Open webshop</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
