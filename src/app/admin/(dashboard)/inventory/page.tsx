import Link from "next/link";

import AdminInventoryListToolbar, {
  type AdminInventoryFilter,
} from "@/components/admin/AdminInventoryListToolbar";
import AdminInventoryTable, {
  type AdminInventoryRow,
} from "@/components/admin/AdminInventoryTable";
import { catalogSku, decodeImportedProductTitle } from "@/lib/products";
import { getLowStockThresholdSetting } from "@/lib/shop-runtime";
import { productStockState, type StockState } from "@/lib/stock";
import { isWritableFilesystem, readTrendyolDatabase } from "@/lib/trendyol-json-store";

export const dynamic = "force-dynamic";

const FILTER_IDS = ["alles", "laag", "uitverkocht", "onbeheerd"] as const;

const FILTER_STATES: Record<Exclude<AdminInventoryFilter, "alles">, StockState> = {
  laag: "low_stock",
  uitverkocht: "out_of_stock",
  onbeheerd: "unmanaged",
};

type PageProps = {
  searchParams?: Promise<{ filter?: string; q?: string }>;
};

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const filter: AdminInventoryFilter = FILTER_IDS.includes(sp.filter as AdminInventoryFilter)
    ? (sp.filter as AdminInventoryFilter)
    : "alles";
  const qInput = typeof sp.q === "string" ? sp.q : "";
  const qTrim = qInput.trim();
  const qLower = qTrim.toLowerCase();

  const [db, lowStockThreshold] = await Promise.all([
    readTrendyolDatabase(),
    getLowStockThresholdSetting(),
  ]);

  const all: AdminInventoryRow[] = db.products
    .map((p) => {
      const state = productStockState(p, lowStockThreshold);
      return {
        id: p.id,
        name: decodeImportedProductTitle(p.name),
        sku: catalogSku(p) ?? "",
        category: p.category ?? "",
        brand: p.brand ?? "",
        stockQuantity: typeof p.stockQuantity === "number" ? p.stockQuantity : null,
        reservedStock: typeof p.reservedStock === "number" ? p.reservedStock : null,
        state,
        thumbUrl: typeof p.image === "string" ? p.image.trim() : "",
        concept: p.productStatus === "concept",
      };
    })
    .sort((a, b) => {
      /* Wat aandacht nodig heeft eerst: uitverkocht, dan bijna op, dan de rest. */
      const rank: Record<StockState, number> = {
        out_of_stock: 0,
        low_stock: 1,
        unmanaged: 2,
        in_stock: 3,
      };
      if (rank[a.state] !== rank[b.state]) {
        return rank[a.state] - rank[b.state];
      }
      return a.name.localeCompare(b.name, "nl");
    });

  const counts = {
    total: all.length,
    low: all.filter((r) => r.state === "low_stock").length,
    out: all.filter((r) => r.state === "out_of_stock").length,
  };

  const rows = all
    .filter((r) => (filter === "alles" ? true : r.state === FILTER_STATES[filter]))
    .filter((r) =>
      qLower ? `${r.id} ${r.name} ${r.sku} ${r.brand} ${r.category}`.toLowerCase().includes(qLower) : true,
    );

  const hasFilters = filter !== "alles" || qTrim.length > 0;
  const emptyTitle = hasFilters ? "Geen resultaten" : "Nog geen producten";
  const emptyCopy = hasFilters
    ? qTrim
      ? `Niets gevonden voor “${qTrim}”.`
      : "Niets gevonden voor deze filters."
    : "Voeg producten toe om voorraad bij te houden.";

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1 admin-m-0">Voorraad</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            {hasFilters
              ? `${rows.length} ${rows.length === 1 ? "product" : "producten"} in deze selectie${qTrim ? ` voor “${qTrim}”` : ""}.`
              : `${counts.total} ${counts.total === 1 ? "product" : "producten"} · ${counts.out} uitverkocht · ${counts.low} laag.`}
          </p>
        </div>
      </div>

      <AdminInventoryListToolbar q={qInput} filter={filter} hasFilters={hasFilters} />

      {rows.length === 0 ? (
        <div className="admin-panel admin-empty">
          <p className="admin-empty-title">{emptyTitle}</p>
          <p className="admin-muted admin-m-0">{emptyCopy}</p>
          {hasFilters ? (
            <Link href="/admin/inventory" className="admin-link-action admin-mt-1">
              Alle voorraad
            </Link>
          ) : (
            <Link href="/admin/products" className="admin-link-action admin-mt-1">
              Naar producten
            </Link>
          )}
        </div>
      ) : (
        <AdminInventoryTable
          rows={rows}
          canWrite={isWritableFilesystem()}
          lowStockThreshold={lowStockThreshold}
        />
      )}
    </div>
  );
}
