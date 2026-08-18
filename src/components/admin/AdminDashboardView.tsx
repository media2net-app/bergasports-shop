"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import AdminMetricCard from "@/components/admin/AdminMetricCard";
import {
  IconCheck,
  IconLeads,
  IconNews,
  IconOrders,
  IconPages,
  IconProducts,
  IconRevenue,
  IconUsers,
} from "@/components/admin/AdminMetricIcons";
import AdminPeriodFilter from "@/components/admin/AdminPeriodFilter";
import {
  aggregateShopOrders,
  type ShopDashboardOrder,
} from "@/lib/dashboard-aggregates";
import {
  DASHBOARD_PERIOD_STORAGE_KEY,
  getDashboardPeriodLabel,
  parseStoredDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard-period";
import type { DashboardRecentOrder } from "@/lib/dashboard-stats";
import { type StockSummary } from "@/lib/stock";

const ORDER_PIPELINE = [
  { key: "awaiting_payment", label: "Wacht op betaling", status: "awaiting_payment" },
  { key: "pending", label: "Open", status: "pending" },
  { key: "confirmed", label: "Bevestigd", status: "confirmed" },
  { key: "processing", label: "In behandeling", status: "processing" },
  { key: "ready_for_pickup", label: "Klaar voor ophalen", status: "ready_for_pickup" },
  { key: "shipped", label: "Verzonden", status: "shipped" },
  { key: "delivered", label: "Opgehaald", status: "delivered" },
  { key: "cancelled", label: "Geannuleerd", status: "cancelled" },
] as const;

const STATUS_TONE: Record<string, string> = {
  awaiting_payment: "wait",
  pending: "warn",
  confirmed: "brand",
  processing: "brand",
  ready_for_pickup: "brand",
  shipped: "ok",
  delivered: "ok",
  cancelled: "mute",
};

const STATUS_LABEL: Record<string, string> = Object.fromEntries(
  ORDER_PIPELINE.map((row) => [row.status, row.label]),
);

function formatEur(amount: number): string {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" });
}

function countStatus(orders: ShopDashboardOrder[], status: string): number {
  return orders.filter((order) => order.status === status).length;
}

export type AdminDashboardViewProps = {
  writable: boolean;
  shopOrders: ShopDashboardOrder[];
  recentOrders: DashboardRecentOrder[];
  productsCount: number;
  pagesPublished: number;
  pagesTotal: number;
  stock: StockSummary;
  newsPublished: number;
  newsDraft: number;
  newLeads: number;
  lowStockThreshold: number;
};

export default function AdminDashboardView(props: AdminDashboardViewProps) {
  const {
    writable,
    shopOrders,
    recentOrders,
    productsCount,
    pagesPublished,
    pagesTotal,
    stock,
    newsPublished,
    newsDraft,
    newLeads,
    lowStockThreshold,
  } = props;

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

  const openNow = countStatus(shopOrders, "pending");
  const toShipNow =
    countStatus(shopOrders, "confirmed") + countStatus(shopOrders, "processing");
  const attentionCount = openNow + toShipNow + stock.lowStock + stock.outOfStock + newLeads;

  const pipelineMax = Math.max(
    1,
    ...ORDER_PIPELINE.map((row) => shopInPeriod.statusCounts[row.status] ?? 0),
  );

  return (
    <div className="admin-dashboard">
      <header className="admin-dash-header">
        <div>
          <h1 className="admin-dash-title">Overzicht</h1>
          <p className="admin-dash-subtitle">
            Open taken zijn van nu. Verkoopcijfers gelden voor {periodLabel.toLowerCase()}.
          </p>
        </div>
        <div className="admin-dash-header-actions">
          <AdminPeriodFilter value={period} onChange={setPeriodFilter} />
          {!writable ? (
            <div className="admin-status-chip admin-status-chip--warn" role="status">
              Alleen-lezen
            </div>
          ) : null}
        </div>
      </header>

      <section className="admin-dash-section" aria-label="Nu te doen">
        <div className="admin-dash-section-head">
          <div>
            <p className="admin-dash-kicker">Nu</p>
            <h2 className="admin-dash-section-title">Te doen</h2>
          </div>
          <p className="admin-muted admin-m-0">
            {attentionCount > 0 ? `${attentionCount} items vragen aandacht` : "Niets openstaand"}
          </p>
        </div>
        <div className="admin-dash-actions">
          <Link
            href="/admin/orders?status=pending"
            className={`admin-dash-action${openNow > 0 ? " is-hot" : ""}`}
          >
            <span className="admin-dash-action-kicker">Bestellingen</span>
            <span className="admin-dash-action-value">{openNow}</span>
            <span className="admin-dash-action-label">Open, nog oppakken</span>
          </Link>
          <Link
            href="/admin/orders?status=confirmed"
            className={`admin-dash-action${toShipNow > 0 ? " is-hot" : ""}`}
          >
            <span className="admin-dash-action-kicker">Verzending</span>
            <span className="admin-dash-action-value">{toShipNow}</span>
            <span className="admin-dash-action-label">Bevestigd, klaar om te versturen</span>
          </Link>
          <Link
            href="/admin/leads"
            className={`admin-dash-action${newLeads > 0 ? " is-hot" : ""}`}
          >
            <span className="admin-dash-action-kicker">Contact</span>
            <span className="admin-dash-action-value">{newLeads}</span>
            <span className="admin-dash-action-label">Nieuwe berichten of afspraken</span>
          </Link>
          <Link
            href="/admin/inventory?filter=uitverkocht"
            className={`admin-dash-action${stock.outOfStock > 0 ? " is-hot" : ""}`}
          >
            <span className="admin-dash-action-kicker">Voorraad</span>
            <span className="admin-dash-action-value">{stock.outOfStock}</span>
            <span className="admin-dash-action-label">Uitverkocht</span>
          </Link>
          <Link
            href="/admin/inventory?filter=laag"
            className={`admin-dash-action${stock.lowStock > 0 ? " is-hot" : ""}`}
          >
            <span className="admin-dash-action-kicker">Voorraad</span>
            <span className="admin-dash-action-value">{stock.lowStock}</span>
            <span className="admin-dash-action-label">{`≤ ${lowStockThreshold} stuks`}</span>
          </Link>
        </div>
      </section>

      <section className="admin-dash-section" aria-label="Verkoop">
        <div className="admin-dash-section-head">
          <div>
            <p className="admin-dash-kicker">Verkoop</p>
            <h2 className="admin-dash-section-title">{periodLabel}</h2>
          </div>
        </div>
        <div className="admin-metric-grid-hero">
          <AdminMetricCard
            hero
            featured
            label="Omzet"
            value={formatEur(shopInPeriod.revenue)}
            hint="Excl. geannuleerd en onbetaald"
            icon={<IconRevenue />}
            iconTone="brand"
          />
          <AdminMetricCard
            hero
            label="Bestellingen"
            value={shopInPeriod.ordersCount}
            hint={`${shopInPeriod.activeOrdersCount} meetellen voor omzet`}
            href="/admin/orders"
            icon={<IconOrders />}
            iconTone="brand"
          />
          <AdminMetricCard
            hero
            label="Gem. orderwaarde"
            value={formatEur(shopInPeriod.avgOrder)}
            hint="Over betaalde orders"
            icon={<IconRevenue />}
            iconTone="brand"
          />
          <AdminMetricCard
            hero
            label="Klanten"
            value={shopInPeriod.customersCount}
            hint="Unieke kopers"
            href="/admin/customers"
            icon={<IconUsers />}
            iconTone="brand"
          />
        </div>
      </section>

      <div className="admin-dash-split">
        <section className="admin-dash-section">
          <div className="admin-panel admin-dash-panel">
            <div className="admin-dash-section-head">
              <div>
                <p className="admin-dash-kicker">Orders</p>
                <h2 className="admin-panel-title admin-m-0">Pipeline</h2>
              </div>
              <p className="admin-muted admin-m-0">{periodLabel}</p>
            </div>
            <div className="admin-order-pipeline admin-mt-05">
              {ORDER_PIPELINE.map((row) => {
                const count = shopInPeriod.statusCounts[row.status] ?? 0;
                if (row.status === "cancelled" && count === 0) {
                  return null;
                }
                const pct = Math.round((count / pipelineMax) * 100);
                return (
                  <Link
                    key={row.key}
                    href={`/admin/orders?status=${row.status}`}
                    className={`admin-order-pipeline-row${count > 0 ? " has-count" : ""}`}
                  >
                    <span className="admin-order-pipeline-label">{row.label}</span>
                    <span className="admin-order-pipeline-value">{count}</span>
                    <span className="admin-order-pipeline-track" aria-hidden>
                      <span
                        className={`admin-order-pipeline-fill admin-order-pipeline-fill--${STATUS_TONE[row.status] ?? "brand"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="admin-dash-section">
          <div className="admin-panel admin-dash-panel">
            <div className="admin-dash-section-head">
              <div>
                <p className="admin-dash-kicker">Laatste</p>
                <h2 className="admin-panel-title admin-m-0">Bestellingen</h2>
              </div>
              <Link href="/admin/orders" className="admin-dash-more">
                Alle orders
              </Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="admin-muted admin-m-0 admin-mt-05">Nog geen bestellingen.</p>
            ) : (
              <ul className="admin-dash-recent">
                {recentOrders.map((order) => (
                  <li key={order.id}>
                    <Link href={`/admin/orders/${order.id}`} className="admin-dash-recent-row">
                      <span className="admin-dash-recent-main">
                        <span className="admin-dash-recent-id">{order.orderNumber}</span>
                        <span className="admin-dash-recent-name">{order.customerName || "—"}</span>
                      </span>
                      <span
                        className={`admin-dash-status admin-dash-status--${STATUS_TONE[order.status] ?? "mute"}`}
                      >
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                      <span className="admin-dash-recent-meta">
                        <span className="admin-dash-recent-total">{formatEur(order.total)}</span>
                        <span className="admin-dash-recent-when">{formatWhen(order.createdAt)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <section className="admin-dash-section" aria-label="Catalogus">
        <div className="admin-dash-section-head">
          <div>
            <p className="admin-dash-kicker">Shop</p>
            <h2 className="admin-dash-section-title">Catalogus &amp; content</h2>
          </div>
        </div>
        <div className="admin-dash-catalog">
          <AdminMetricCard
            label="Producten"
            value={productsCount}
            hint="In de catalogus"
            href="/admin/products"
            icon={<IconProducts />}
            iconTone="brand"
          />
          <AdminMetricCard
            label="Op voorraad"
            value={stock.inStock}
            hint={stock.unmanaged > 0 ? `${stock.unmanaged} zonder aantal` : "Met aantal ingevuld"}
            href="/admin/inventory"
            icon={<IconCheck />}
            iconTone="success"
          />
          <AdminMetricCard
            label="Nieuws"
            value={newsPublished}
            hint={newsDraft > 0 ? `${newsDraft} concept` : "Gepubliceerd"}
            href="/admin/news"
            icon={<IconNews />}
          />
          <AdminMetricCard
            label="Contact"
            value={newLeads}
            hint="Nieuwe berichten"
            href="/admin/leads"
            icon={<IconLeads />}
            iconTone="brand"
          />
          <AdminMetricCard
            label="Pagina's"
            value={`${pagesPublished}/${pagesTotal}`}
            hint="Gepubliceerd"
            href="/admin/pages"
            icon={<IconPages />}
          />
        </div>
      </section>
    </div>
  );
}
