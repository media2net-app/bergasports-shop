import "server-only";

import type { EasySalesDashboardOrder } from "@/lib/dashboard-aggregates";
import { getEasySalesConfig, resolveEasySalesAccessToken } from "@/lib/easy-sales";

type EasySalesOrderRow = {
  order_date?: string;
  status?: string;
  total_value?: string;
  value?: string;
  marketplace?: string | null;
  website?: string | null;
  customer?: { email?: string | null };
};

type EasySalesOrdersPage = {
  data?: EasySalesOrderRow[];
  meta?: { last_page?: number };
};

const PER_PAGE = 100;
const PAGE_BATCH = 6;

function orderRevenue(row: EasySalesOrderRow): number {
  const raw = row.total_value ?? row.value ?? "0";
  const n = Number.parseFloat(String(raw));
  return Number.isFinite(n) ? n : 0;
}

function marketplaceLabel(row: EasySalesOrderRow): string {
  const mp = row.marketplace?.trim();
  if (mp) return mp;
  if (row.website) return "Website";
  return "Shop";
}

function mapRow(row: EasySalesOrderRow): EasySalesDashboardOrder {
  return {
    orderDate: String(row.order_date ?? ""),
    total: orderRevenue(row),
    status: String(row.status ?? "Unknown"),
    marketplace: marketplaceLabel(row),
    customerEmail: String(row.customer?.email ?? ""),
  };
}

async function fetchOrdersPage(
  baseUrl: string,
  accessToken: string,
  page: number,
): Promise<EasySalesOrdersPage> {
  const url = `${baseUrl}/orders?page=${page}&per_page=${PER_PAGE}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    next: { revalidate: 120 },
  });
  if (!res.ok) {
    throw new Error(`Easy-Sales orders request failed (${res.status})`);
  }
  return (await res.json()) as EasySalesOrdersPage;
}

export async function listEasySalesDashboardOrders(): Promise<EasySalesDashboardOrder[] | null> {
  const config = await getEasySalesConfig();
  if (!config) {
    return null;
  }

  const accessToken = await resolveEasySalesAccessToken(config);
  const first = await fetchOrdersPage(config.baseUrl, accessToken, 1);
  const lastPage = Math.max(1, first.meta?.last_page ?? 1);
  const rows: EasySalesOrderRow[] = [...(first.data ?? [])];

  const remainingPages = Array.from({ length: lastPage - 1 }, (_, i) => i + 2);
  for (let i = 0; i < remainingPages.length; i += PAGE_BATCH) {
    const batch = remainingPages.slice(i, i + PAGE_BATCH);
    const pages = await Promise.all(
      batch.map((page) => fetchOrdersPage(config.baseUrl, accessToken, page)),
    );
    for (const page of pages) {
      if (page.data?.length) {
        rows.push(...page.data);
      }
    }
  }

  return rows.map(mapRow);
}
