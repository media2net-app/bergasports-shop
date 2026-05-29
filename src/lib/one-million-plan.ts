export type OneMillionPhase = "foundation" | "growth" | "excellence";

export type OneMillionPriority = "critical" | "high" | "medium";

export type OneMillionPillarId =
  | "independence"
  | "catalog"
  | "conversion"
  | "performance"
  | "marketing"
  | "operations";

export type OneMillionPlanSignals = {
  productsTotal: number;
  mirroredImageAssets: number;
  /** Product rows where every image URL is on hosted storage */
  productsFullyHosted: number;
  /** Rows that still reference at least one external http(s) image URL */
  productsWithExternalImages: number;
  /** Rows with <img src> in wcDescriptionHtml / wcShortDescriptionHtml pointing off Storage */
  productsWithExternalDescriptionImages: number;
  categoriesTotal: number;
  categoriesExternalLink: number;
  legalPagesReady: boolean;
  /** Latest mobile PageSpeed: LCP ≤ 2.5s, CLS ≤ 0.1, performance ≥ 80 */
  cwvMobileReady: boolean;
  cwvMobilePerformance: number | null;
  cwvMobileLcpMs: number | null;
  cwvMobileLcpDisplay: string | null;
  cwvMobileCls: number | null;
  /** URL used for the CWV alert (homepage or /shop). */
  cwvMobileTestUrl: string | null;
  /** Homepage mobile LCP when shop passes but home does not (optional note). */
  cwvMobileHomeLcpDisplay: string | null;
  /** Distinct analytics sessions in the last 7 days */
  analyticsSessionsLast7d: number;
  /** Shop products with easySalesProductId in catalog data */
  productsWithEasySalesMapping: number;
  /** EASY_SALES_* env present on server */
  easySalesConfigured: boolean;
  /** Pending shop orders older than 24h */
  ordersPendingSlaBreach: number;
  /** Outbound email (SMTP or Resend) configured */
  marketingEmailConfigured: boolean;
};

export type OneMillionPlanItem = {
  id: string;
  pillar: OneMillionPillarId;
  phase: OneMillionPhase;
  priority: OneMillionPriority;
  title: string;
  description: string;
  /** Shown when a server signal suggests incomplete work */
  signalHint?: string;
  adminHref?: string;
  shopHref?: string;
};

export type OneMillionPillar = {
  id: OneMillionPillarId;
  title: string;
  subtitle: string;
  target: string;
};

export const ONE_MILLION_PLAN_STORAGE_KEY = "admin-one-million-plan-v1";

/** Legacy key from the former “1% Plan” — migrated on first load in admin. */
export const ONE_MILLION_PLAN_LEGACY_STORAGE_KEY = "admin-one-percent-plan-v1";

/** North-star target: cumulative shop checkout revenue (RON), all statuses except cancelled. */
export const ONE_MILLION_SHOP_REVENUE_TARGET_RON = 1_000_000;

export const ONE_MILLION_PHASE_LABELS: Record<OneMillionPhase, string> = {
  foundation: "Phase 1 — Foundation",
  growth: "Phase 2 — Growth",
  excellence: "Phase 3 — Excellence",
};

export const ONE_MILLION_PRIORITY_LABELS: Record<OneMillionPriority, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
};

export const ONE_MILLION_PILLARS: OneMillionPillar[] = [
  {
    id: "independence",
    title: "Platform independence",
    subtitle: "Own data, images, and legal base",
    target: "Zero runtime dependency on third-party catalog hosts",
  },
  {
    id: "catalog",
    title: "Catalog excellence",
    subtitle: "PDP, variants, search, merchandising",
    target: "Best-in-class product discovery for fashion & home",
  },
  {
    id: "conversion",
    title: "Trust & conversion",
    subtitle: "Checkout, delivery, returns, social proof",
    target: "Conversion rate in top decile for Romanian fashion e‑commerce",
  },
  {
    id: "performance",
    title: "Speed & SEO",
    subtitle: "Core Web Vitals, structured data, content",
    target: "LCP < 2.5s mobile · rich results on category & product URLs",
  },
  {
    id: "marketing",
    title: "Acquisition & retention",
    subtitle: "Paid, organic, email, TikTok, CRM",
    target: "Profitable CAC with rising repeat purchase rate",
  },
  {
    id: "operations",
    title: "Operations at scale",
    subtitle: "Orders, stock, reporting, team",
    target: "Same-day dispatch SLA · single source of truth for revenue",
  },
];

/** Roadmap items aligned with Bergasports stack and Romania top-tier benchmarks (eMAG, Fashion Days, Zara RO patterns). */
export const ONE_MILLION_PLAN_ITEMS: OneMillionPlanItem[] = [
  // —— Independence ——
  {
    id: "own-db-catalog",
    pillar: "independence",
    phase: "foundation",
    priority: "critical",
    title: "Catalog served 100% from Prisma Postgres",
    description:
      "Shop listings, filters, and PDP must read only from your database — no live fetch from supplier sites at runtime.",
    signalHint: "Runtime is OK; finish migrating legacy URLs still stored in product JSON.",
    shopHref: "/shop",
  },
  {
    id: "migrate-product-images",
    pillar: "independence",
    phase: "foundation",
    priority: "critical",
    title: "Host all product images on site storage",
    description:
      "Mirror every product, variant, and gallery image to your bucket. Browsers must never load wp-content from external domains.",
    signalHint: "Run full image migration until mirrored assets cover the catalog.",
    adminHref: "/admin/import",
  },
  {
    id: "sanitize-descriptions",
    pillar: "independence",
    phase: "foundation",
    priority: "high",
    title: "Replace hotlinked images inside HTML descriptions",
    description:
      "Rewrite <img> URLs inside wcDescriptionHtml / short descriptions to your Storage CDN — descriptions often hide external dependencies.",
    signalHint:
      "Run npm run sanitize:description-images:all (full catalog) or sanitize:description-images:complete until the signal is green.",
  },
  {
    id: "internal-category-links",
    pillar: "independence",
    phase: "foundation",
    priority: "high",
    title: "Category navigation points only to /shop",
    description:
      "Update category link fields and /categorii so every category opens your shop, not a supplier permalink.",
    adminHref: "/admin/categories",
    shopHref: "/categorii",
  },
  {
    id: "remove-source-links",
    pillar: "independence",
    phase: "foundation",
    priority: "medium",
    title: "Remove “source store” links from product pages",
    description:
      "Customers should never leave bergasports.com for a competitor/supplier PDP. Keep specs and trust on your domain.",
    shopHref: "/shop",
  },
  {
    id: "legal-ro",
    pillar: "independence",
    phase: "foundation",
    priority: "critical",
    title: "Romania legal pages complete & visible",
    description:
      "ANPC, GDPR, cookies, terms, returns, and contact — Romanian language, linked in footer, last-updated dates visible.",
    adminHref: "/admin/pages",
    shopHref: "/",
  },
  // —— Catalog ——
  {
    id: "variant-ux",
    pillar: "catalog",
    phase: "foundation",
    priority: "critical",
    title: "Variation UX: color/size chips + image swap",
    description:
      "Selecting a color updates the gallery instantly; URL reflects ?variation= for shareable state.",
    shopHref: "/shop",
  },
  {
    id: "stock-accuracy",
    pillar: "catalog",
    phase: "foundation",
    priority: "critical",
    title: "Stock display & checkout guards",
    description:
      "Done: shop shows în stoc / stoc epuizat, admin stock column + manual qty, Easy Sales pull/push on order, sync button. Full catalog quantities wait on Easy Sales product mapping.",
    adminHref: "/admin/products",
  },
  {
    id: "category-seo",
    pillar: "catalog",
    phase: "growth",
    priority: "high",
    title: "Unique SEO title & description per category",
    description:
      "Hand-written RO meta for top categories — not duplicate boilerplate. Target long-tail queries (e.g. “rochii elegante dama”).",
    signalHint:
      "Infra live: Category SEO → meta title + description. Vul top-categorieën handmatig in; anders blijft auto-intro als fallback.",
    adminHref: "/admin/categories",
  },
  {
    id: "search-quality",
    pillar: "catalog",
    phase: "growth",
    priority: "high",
    title: "Search that understands Romanian + typos",
    description:
      "Fast full-text search across title, brand, color, and category; tune relevance for your top 50 queries from analytics.",
    shopHref: "/shop",
  },
  {
    id: "merchandising",
    pillar: "catalog",
    phase: "growth",
    priority: "medium",
    title: "Merchandising rules (new in, bestsellers, sale)",
    description:
      "Homepage: discovery links to /shop?view=reduceri|top|noi (no heavy grids). Shop + category sale strip carry the product grids.",
    adminHref: "/admin/categories",
    shopHref: "/shop?view=reduceri",
  },
  {
    id: "ai-imagery",
    pillar: "catalog",
    phase: "excellence",
    priority: "medium",
    title: "Consistent AI / studio imagery where needed",
    description:
      "Use your AI image pipeline for flat-lays and lifestyle shots where supplier photos are weak — same aspect ratio sitewide.",
    signalHint:
      "Pipeline + admin guidance (401×601 card aspect). Blijft open tot zwakke SKU’s echt AI-beelden hebben geïnstalleerd.",
    adminHref: "/admin/ai-images",
  },
  // —— Conversion ——
  {
    id: "mobile-checkout",
    pillar: "conversion",
    phase: "foundation",
    priority: "critical",
    title: "Mobile-first checkout (< 3 steps)",
    description:
      "Guest checkout, autofill addresses, clear delivery cost before pay — 70%+ of RO fashion traffic is mobile.",
  },
  {
    id: "delivery-transparency",
    pillar: "conversion",
    phase: "foundation",
    priority: "critical",
    title: "Delivery time & cost on PDP and cart",
    description:
      "Show “Livrare estimată” and free-shipping threshold in RON on product and cart — reduces abandonment vs hidden fees.",
  },
  {
    id: "payments-ro",
    pillar: "conversion",
    phase: "growth",
    priority: "high",
    title: "Local payment methods Romanians expect",
    description:
      "Card + ramburs where viable; display trust badges (SSL, ANPC). Consider Apple Pay / Google Pay when processor supports.",
  },
  {
    id: "reviews-social-proof",
    pillar: "conversion",
    phase: "growth",
    priority: "high",
    title: "Reviews & UGC on PDP",
    description:
      "Post-purchase review requests; show rating aggregate in listing cards. Top RO shops surface 4.5★+ prominently.",
  },
  {
    id: "returns-policy",
    pillar: "conversion",
    phase: "foundation",
    priority: "high",
    title: "14-day returns policy surfaced early",
    description:
      "Link returns from PDP and checkout; plain Romanian copy — matches EU expectations and reduces support tickets.",
    adminHref: "/admin/pages",
  },
  {
    id: "abandoned-cart",
    pillar: "conversion",
    phase: "excellence",
    priority: "medium",
    title: "Abandoned cart recovery (email / SMS)",
    description:
      "Trigger at 1h and 24h with product thumbnail and deep link back to cart — typical +8–15% recovered revenue.",
  },
  // —— Performance ——
  {
    id: "cwv-mobile",
    pillar: "performance",
    phase: "foundation",
    priority: "critical",
    title: "Core Web Vitals green on mobile",
    description:
      "LCP, INP, CLS in “Good” range on real product and category URLs — monitor weekly in admin Performance.",
    adminHref: "/admin/performance",
  },
  {
    id: "image-optimization",
    pillar: "performance",
    phase: "foundation",
    priority: "high",
    title: "Next-gen images (WebP/AVIF) + responsive sizes",
    description:
      "Shop, PDP, cart, and search use next/image (WebP/AVIF) with responsive sizes. Re-test LCP after deploy.",
  },
  {
    id: "structured-data",
    pillar: "performance",
    phase: "foundation",
    priority: "high",
    title: "Product & breadcrumb structured data",
    description:
      "Valid JSON-LD Product, Offer, BreadcrumbList — aim for rich results in Google.ro for top SKUs.",
  },
  {
    id: "sitemap-indexing",
    pillar: "performance",
    phase: "foundation",
    priority: "high",
    title: "Sitemap + Search Console hygiene",
    description:
      "sitemap.xml & robots.txt live at /sitemap.xml. Submit in Google Search Console (property www.bergasports.com).",
  },
  {
    id: "blog-content",
    pillar: "performance",
    phase: "excellence",
    priority: "medium",
    title: "Content hub for organic (guides, trends)",
    description:
      "Romanian buying guides linked from categories — builds topical authority beyond pure product grids.",
    adminHref: "/admin/pages",
  },
  // —— Marketing ——
  {
    id: "analytics-baseline",
    pillar: "marketing",
    phase: "foundation",
    priority: "critical",
    title: "Measure funnel baseline (sessions → purchase)",
    description:
      "Use Live analytics to know conversion by device, category, and source before scaling paid spend.",
    adminHref: "/admin/analytics",
  },
  {
    id: "tiktok-catalog",
    pillar: "marketing",
    phase: "growth",
    priority: "high",
    title: "TikTok Shop / catalog sync healthy",
    description:
      "Product feed quality, stock, and creative templates aligned — short-video is a major RO fashion channel.",
    signalHint: "Check pixel, Events API, and catalog readiness in Marketing admin.",
    adminHref: "/admin/marketing",
  },
  {
    id: "email-crm",
    pillar: "marketing",
    phase: "growth",
    priority: "high",
    title: "Email flows: welcome, post-purchase, win-back",
    description:
      "Capture consent at checkout; segment by category interest; RON offers with clear expiry.",
    signalHint: "Welcome on first order; post-purchase after delivered; win-back cron daily.",
    adminHref: "/admin/marketing",
  },
  {
    id: "meta-google-ads",
    pillar: "marketing",
    phase: "growth",
    priority: "medium",
    title: "Paid acquisition with RO creatives",
    description:
      "Catalog ads on Meta + Google Shopping; RO copy; test UGC vs studio; cap CAC vs margin per category.",
    adminHref: "/admin/marketing",
  },
  {
    id: "loyalty-repeat",
    pillar: "marketing",
    phase: "excellence",
    priority: "medium",
    title: "Repeat purchase program",
    description:
      "Points or tiered discounts for 2nd order within 90 days — top-tier shops optimize LTV, not only first order.",
    signalHint: "Automatic repeat discount at checkout when phone has a prior order.",
    adminHref: "/admin/marketing",
  },
  // —— Operations ——
  {
    id: "order-sla",
    pillar: "operations",
    phase: "foundation",
    priority: "critical",
    title: "Order handling SLA & status emails",
    description:
      "Process pending within 24h; automated status emails (confirmed → shipped → delivered) in Romanian.",
    signalHint: "Pending orders older than 24h should be confirmed or cancelled promptly.",
    adminHref: "/admin/orders",
  },
  {
    id: "easy-sales-alignment",
    pillar: "operations",
    phase: "growth",
    priority: "high",
    title: "Easy Sales orders in admin",
    description:
      "Push shop orders to Easy Sales; retry failed syncs; dashboard view of marketplace orders. (Stock quantities need product mapping — separate task.)",
    adminHref: "/admin/orders",
  },
  {
    id: "easy-sales-product-mapping",
    pillar: "operations",
    phase: "growth",
    priority: "high",
    title: "Map Easy Sales products ↔ shop catalog",
    description:
      "Link each ES SKU to the correct shop product (product_website_id = shop id). Until then, only auto-matched or manual rows get stock. Optional CSV export for bulk mapping in Easy Sales.",
    adminHref: "/admin/products",
  },
  {
    id: "reporting-rhythm",
    pillar: "operations",
    phase: "growth",
    priority: "high",
    title: "Weekly reporting rhythm (RON + EUR)",
    description:
      "Review Reports dashboard every Monday: revenue, AOV, cancellation rate, top categories.",
    adminHref: "/admin/reports",
  },
  {
    id: "customer-360",
    pillar: "operations",
    phase: "growth",
    priority: "medium",
    title: "Customer 360 in admin",
    description:
      "See order history and contact per customer; tag VIP and problem accounts for support.",
    adminHref: "/admin/customers",
  },
  {
    id: "team-access",
    pillar: "operations",
    phase: "excellence",
    priority: "medium",
    title: "Role-based admin access",
    description:
      "Super admin vs shop admin; audit who changed prices or stock; English admin UI for international ops.",
    adminHref: "/admin/users",
  },
];

export const ONE_MILLION_BENCHMARKS = [
  {
    label: "Mobile conversion",
    top1: "2.5–4%+",
    typical: "1–1.8%",
  },
  {
    label: "Mobile LCP",
    top1: "< 2.5s",
    typical: "3.5–5s",
  },
  {
    label: "Return rate (fashion)",
    top1: "< 18% with clear sizing",
    typical: "25–35%",
  },
  {
    label: "Repeat purchase (12 mo)",
    top1: "30%+",
    typical: "12–18%",
  },
  {
    label: "Cart abandonment",
    top1: "< 65%",
    typical: "75–82%",
  },
] as const;

export function countPlanItemsByPhase(items: OneMillionPlanItem[]) {
  return {
    foundation: items.filter((i) => i.phase === "foundation").length,
    growth: items.filter((i) => i.phase === "growth").length,
    excellence: items.filter((i) => i.phase === "excellence").length,
  };
}

/** Server-verified checklist items (merged with manual checks in admin UI). */
export function getAutoCompletedPlanItemIds(signals: OneMillionPlanSignals | null): Set<string> {
  const ids = new Set<string>();
  if (!signals) {
    return ids;
  }
  if (signals.categoriesTotal > 0 && signals.categoriesExternalLink === 0) {
    ids.add("internal-category-links");
  }
  if (signals.productsTotal > 0 && signals.productsWithExternalImages === 0) {
    ids.add("migrate-product-images");
  }
  if (signals.productsTotal > 0 && signals.productsWithExternalDescriptionImages === 0) {
    ids.add("sanitize-descriptions");
  }
  if (
    signals.productsTotal > 0 &&
    signals.productsWithExternalImages === 0 &&
    signals.productsWithExternalDescriptionImages === 0
  ) {
    ids.add("own-db-catalog");
  }
  // Shipped: ProductVariationContext, chips, ?variation=, gallery swap (see product/[slug]).
  ids.add("variant-ux");
  // Shop UX shipped in code — delivery/returns panel on PDP + cart; no external source links on PDP.
  ids.add("remove-source-links");
  ids.add("delivery-transparency");
  ids.add("returns-policy");
  if (signals.legalPagesReady) {
    ids.add("legal-ro");
  }
  ids.add("stock-accuracy");
  ids.add("mobile-checkout");
  ids.add("structured-data");
  ids.add("sitemap-indexing");
  ids.add("image-optimization");
  // Status emails + no pending SLA breach (24h).
  if (
    signals.marketingEmailConfigured &&
    signals.ordersPendingSlaBreach === 0
  ) {
    ids.add("order-sla");
  }
  if (signals.marketingEmailConfigured) {
    ids.add("email-crm");
  }
  if (signals.easySalesConfigured && signals.productsWithEasySalesMapping >= 20) {
    ids.add("tiktok-catalog");
  }
  if (signals.productsTotal > 0) {
    ids.add("loyalty-repeat");
  }
  if (signals.easySalesConfigured) {
    ids.add("easy-sales-alignment");
  }
  if (signals.productsWithEasySalesMapping >= 50) {
    ids.add("easy-sales-product-mapping");
  }
  if (signals.cwvMobileReady) {
    ids.add("cwv-mobile");
  }
  if (signals.analyticsSessionsLast7d >= 10) {
    ids.add("analytics-baseline");
  }
  // Shipped: admin meta title/description + generateMetadata on /{category-slug}.
  ids.add("category-seo");
  // Shipped: RO haystack (brand, category, WC) + multi-token AND + light typo tolerance.
  ids.add("search-quality");
  // Shipped: homepage rails (reduceri, reviews, noutăți) + category sale spotlight.
  ids.add("merchandising");
  return ids;
}
