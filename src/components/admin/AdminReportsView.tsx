"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  aggregateEasySalesOrders,
  aggregateShopOrders,
  type EasySalesDashboardOrder,
  type ShopDashboardOrder,
} from "@/lib/dashboard-aggregates";
import {
  DASHBOARD_CURRENCY_STORAGE_KEY,
  formatDashboardMoney,
  parseStoredDashboardCurrency,
  type DashboardDisplayCurrency,
} from "@/lib/dashboard-currency";
import {
  DASHBOARD_PERIOD_OPTIONS,
  DASHBOARD_PERIOD_STORAGE_KEY,
  getDashboardPeriodLabel,
  parseStoredDashboardPeriod,
  type DashboardPeriod,
} from "@/lib/dashboard-period";

export type AdminReportsViewProps = {
  superAdmin: boolean;
  ronPerEur: number;
  shopOrders: ShopDashboardOrder[];
  easySalesOrders: EasySalesDashboardOrder[];
  easySalesReady: boolean;
};

export default function AdminReportsView({
  superAdmin,
  ronPerEur,
  shopOrders,
  easySalesOrders,
  easySalesReady,
}: AdminReportsViewProps) {
  const [period, setPeriod] = useState<DashboardPeriod>("30d");
  const [currency, setCurrency] = useState<DashboardDisplayCurrency>("RON");

  useEffect(() => {
    setPeriod(parseStoredDashboardPeriod(localStorage.getItem(DASHBOARD_PERIOD_STORAGE_KEY)));
    setCurrency(parseStoredDashboardCurrency(localStorage.getItem(DASHBOARD_CURRENCY_STORAGE_KEY)));
  }, []);

  const setPeriodFilter = useCallback((next: DashboardPeriod) => {
    setPeriod(next);
    localStorage.setItem(DASHBOARD_PERIOD_STORAGE_KEY, next);
  }, []);

  const setCurrencyFilter = useCallback((next: DashboardDisplayCurrency) => {
    setCurrency(next);
    localStorage.setItem(DASHBOARD_CURRENCY_STORAGE_KEY, next);
  }, []);

  const shop = useMemo(() => aggregateShopOrders(shopOrders, period), [shopOrders, period]);
  const easy = useMemo(() => aggregateEasySalesOrders(easySalesOrders, period), [easySalesOrders, period]);
  const sales = superAdmin && easySalesReady ? easy : shop;
  const periodLabel = getDashboardPeriodLabel(period);

  const money = (amount: number) => formatDashboardMoney(amount, currency, ronPerEur);

  return (
    <div className="admin-stack">
      <div className="admin-dash-header-actions admin-mb-1">
        <div className="admin-period-filter" role="group" aria-label="Period">
          {DASHBOARD_PERIOD_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className={`admin-period-filter-btn${period === option.id ? " is-active" : ""}`}
              onClick={() => setPeriodFilter(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="admin-currency-switcher" role="group" aria-label="Currency">
          {(["RON", "EUR"] as const).map((code) => (
            <button
              key={code}
              type="button"
              className={`admin-currency-switcher-btn${currency === code ? " is-active" : ""}`}
              onClick={() => setCurrencyFilter(code)}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-metric-grid-wide">
        <div className="admin-panel admin-stack-tight">
          <h2 className="admin-panel-title admin-m-0">
            {superAdmin && easySalesReady ? "Easy Sales revenue" : "Shop revenue"}
          </h2>
          <p className="admin-muted admin-m-0">{periodLabel}</p>
          <p className="admin-live-metric-value admin-m-0">{money(sales.revenue)}</p>
          <p className="admin-muted admin-m-0">
            {sales.ordersCount} orders · {sales.customersCount} unique customers · avg {money(sales.avgOrder)}
          </p>
        </div>
        <div className="admin-panel admin-stack-tight">
          <h2 className="admin-panel-title admin-m-0">Shop (checkout)</h2>
          <p className="admin-muted admin-m-0">{periodLabel}</p>
          <p className="admin-live-metric-value admin-m-0">{money(shop.revenue)}</p>
          <p className="admin-muted admin-m-0">{shop.ordersCount} shop orders</p>
        </div>
      </div>

      <div className="admin-panel admin-table-wrap">
        <h2 className="admin-panel-title admin-m-0">Shop order status</h2>
        <table className="admin-table admin-mt-05">
          <thead>
            <tr>
              <th>Status</th>
              <th className="admin-table-num">Count</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(shop.statusCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([status, count]) => (
                <tr key={status}>
                  <td>{status}</td>
                  <td className="admin-table-num">{count}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {superAdmin && easySalesReady ? (
        <div className="admin-panel admin-table-wrap">
          <h2 className="admin-panel-title admin-m-0">Easy Sales channels</h2>
          <table className="admin-table admin-mt-05">
            <thead>
              <tr>
                <th>Channel</th>
                <th className="admin-table-num">Orders</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(easy.marketplaceCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => (
                  <tr key={name}>
                    <td>{name}</td>
                    <td className="admin-table-num">{count}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
