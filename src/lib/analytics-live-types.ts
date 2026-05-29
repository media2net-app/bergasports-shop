export type LiveVisitorMarker = {
  sessionId: string;
  lat: number;
  lng: number;
  city: string | null;
  countryCode: string | null;
  path: string;
  productId: number | null;
  lastSeenAt: string;
};

import type { DashboardPeriod } from "@/lib/dashboard-period";

export type AnalyticsLiveSnapshot = {
  generatedAt: string;
  period: DashboardPeriod;
  periodLabel: string;
  visitorsNow: number;
  activeCartsNow: number;
  checkoutNow: number;
  /** Sessions with first_seen in selected period */
  sessions: number;
  /** Page views in selected period */
  pageViews: number;
  /** Non-cancelled orders in selected period */
  orders: number;
  /** Orders ÷ sessions × 100 for selected period */
  conversionRate: number | null;
  visitors: LiveVisitorMarker[];
  topPages: { path: string; views: number }[];
  topProducts: { productId: number; views: number; name: string | null }[];
  /** Live — always last 10 minutes */
  pageViewsLast10Min: { minute: string; views: number }[];
};
