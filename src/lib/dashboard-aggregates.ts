import { customerKeyFromPhone } from "@/lib/customers";
import { isDateInDashboardPeriod, type DashboardPeriod } from "@/lib/dashboard-period";

export type ShopDashboardOrder = {
  createdAt: string;
  total: number;
  status: string;
  customerPhone: string;
};

export type EasySalesDashboardOrder = {
  orderDate: string;
  total: number;
  status: string;
  marketplace: string;
  customerEmail: string;
};

export type DashboardSalesMetrics = {
  revenue: number;
  ordersCount: number;
  activeOrdersCount: number;
  customersCount: number;
  avgOrder: number;
  statusCounts: Record<string, number>;
  marketplaceCounts: Record<string, number>;
};

const SHOP_CANCELLED = new Set(["cancelled", "canceled"]);
const ES_CANCELLED = new Set(["canceled", "cancelled", "return", "returned"]);

function parseDate(value: string): Date | null {
  if (!value) return null;
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const d = new Date(normalized);
  return Number.isNaN(d.getTime()) ? null : d;
}

function finalizeMetrics(metrics: Omit<DashboardSalesMetrics, "avgOrder">): DashboardSalesMetrics {
  return {
    ...metrics,
    avgOrder: metrics.activeOrdersCount > 0 ? metrics.revenue / metrics.activeOrdersCount : 0,
  };
}

export function aggregateShopOrders(orders: ShopDashboardOrder[], period: DashboardPeriod): DashboardSalesMetrics {
  const statusCounts: Record<string, number> = {};
  const customerKeys = new Set<string>();
  let revenue = 0;
  let ordersCount = 0;
  let activeOrdersCount = 0;

  for (const order of orders) {
    const date = parseDate(order.createdAt);
    if (!date || !isDateInDashboardPeriod(date, period)) {
      continue;
    }

    ordersCount += 1;
    const status = order.status || "unknown";
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;

    const customerKey = customerKeyFromPhone(order.customerPhone);
    if (customerKey) {
      customerKeys.add(customerKey);
    }

    if (SHOP_CANCELLED.has(status.toLowerCase())) {
      continue;
    }

    activeOrdersCount += 1;
    revenue += order.total;
  }

  return finalizeMetrics({
    revenue,
    ordersCount,
    activeOrdersCount,
    customersCount: customerKeys.size,
    statusCounts,
    marketplaceCounts: {},
  });
}

export function aggregateEasySalesOrders(
  orders: EasySalesDashboardOrder[],
  period: DashboardPeriod,
): DashboardSalesMetrics {
  const statusCounts: Record<string, number> = {};
  const marketplaceCounts: Record<string, number> = {};
  const customerEmails = new Set<string>();
  let revenue = 0;
  let ordersCount = 0;
  let activeOrdersCount = 0;

  for (const order of orders) {
    const date = parseDate(order.orderDate);
    if (!date || !isDateInDashboardPeriod(date, period)) {
      continue;
    }

    ordersCount += 1;
    const status = order.status || "Unknown";
    statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    marketplaceCounts[order.marketplace] = (marketplaceCounts[order.marketplace] ?? 0) + 1;

    const email = order.customerEmail.trim().toLowerCase();
    if (email) {
      customerEmails.add(email);
    }

    if (ES_CANCELLED.has(status.toLowerCase())) {
      continue;
    }

    activeOrdersCount += 1;
    revenue += order.total;
  }

  return finalizeMetrics({
    revenue,
    ordersCount,
    activeOrdersCount,
    customersCount: customerEmails.size,
    statusCounts,
    marketplaceCounts,
  });
}

export function countAllShopPending(orders: ShopDashboardOrder[]): number {
  return orders.filter((o) => o.status === "pending").length;
}
