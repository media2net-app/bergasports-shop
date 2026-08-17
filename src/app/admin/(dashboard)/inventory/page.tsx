import Link from "next/link";

import AdminInventoryTable, {
  type AdminInventoryRow,
} from "@/components/admin/AdminInventoryTable";
import { decodeImportedProductTitle } from "@/lib/products";
import { getLowStockThresholdSetting } from "@/lib/shop-runtime";
import {
  productAvailableStock,
  productStockState,
  type StockState,
} from "@/lib/stock";
import { isWritableFilesystem, readTrendyolDatabase } from "@/lib/trendyol-json-store";

export const dynamic = "force-dynamic";

const FILTER_IDS = ["alles", "laag", "uitverkocht", "onbeheerd"] as const;
type FilterId = (typeof FILTER_IDS)[number];

const FILTER_STATES: Record<Exclude<FilterId, "alles">, StockState> = {
  laag: "low_stock",
  uitverkocht: "out_of_stock",
  onbeheerd: "unmanaged",
};

type PageProps = {
  searchParams?: Promise<{ filter?: string; q?: string }>;
};

export default async function AdminInventoryPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const filter: FilterId = FILTER_IDS.includes(sp.filter as FilterId)
    ? (sp.filter as FilterId)
    : "alles";
  const qInput = typeof sp.q === "string" ? sp.q : "";
  const qLower = qInput.trim().toLowerCase();

  const [db, lowStockThreshold] = await Promise.all([
    readTrendyolDatabase(),
    getLowStockThresholdSetting(),
  ]);

  const filters: { id: FilterId; label: string }[] = [
    { id: "alles", label: "Alle producten" },
    { id: "laag", label: `Bijna uitverkocht (≤ ${lowStockThreshold})` },
    { id: "uitverkocht", label: "Uitverkocht" },
    { id: "onbeheerd", label: "Zonder aantal" },
  ];

  const all: AdminInventoryRow[] = db.products
    .map((p) => {
      const state = productStockState(p, lowStockThreshold);
      return {
        id: p.id,
        name: decodeImportedProductTitle(p.name),
        category: p.category ?? "",
        brand: p.brand ?? "",
        stockQuantity: typeof p.stockQuantity === "number" ? p.stockQuantity : null,
        reservedStock: typeof p.reservedStock === "number" ? p.reservedStock : null,
        available: productAvailableStock(p),
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
    unmanaged: all.filter((r) => r.state === "unmanaged").length,
  };

  const rows = all
    .filter((r) => (filter === "alles" ? true : r.state === FILTER_STATES[filter]))
    .filter((r) =>
      qLower ? `${r.id} ${r.name} ${r.brand} ${r.category}`.toLowerCase().includes(qLower) : true,
    );

  const filterHref = (id: FilterId) => {
    const params = new URLSearchParams();
    if (id !== "alles") {
      params.set("filter", id);
    }
    if (qInput.trim()) {
      params.set("q", qInput.trim());
    }
    const qs = params.toString();
    return qs ? `/admin/inventory?${qs}` : "/admin/inventory";
  };

  return (
    <div className="admin-stack">
      <div className="admin-page-head">
        <div>
          <h1 className="admin-h1">Voorraad</h1>
          <p className="admin-muted admin-m-0 admin-mt-05">
            Pas het aantal per product aan of zet een product op uitverkocht. Producten zonder aantal
            volgen de handmatige schakelaar.
          </p>
        </div>
        <div className="admin-tools-row">
          <Link href="/admin/products" className="admin-btn-secondary">
            Naar producten
          </Link>
        </div>
      </div>

      <div className="admin-panel-surface admin-stack-tight">
        <div className="admin-stat-inline">
          <span>
            <strong>{counts.total}</strong> producten
          </span>
          <span>
            <strong>{counts.out}</strong> uitverkocht
          </span>
          <span>
            <strong>{counts.low}</strong> bijna uitverkocht
          </span>
          <span>
            <strong>{counts.unmanaged}</strong> zonder aantal
          </span>
        </div>
        <div className="admin-filter-tabs">
          {filters.map((f) => (
            <Link
              key={f.id}
              href={filterHref(f.id)}
              className={`admin-filter-tab${filter === f.id ? " is-active" : ""}`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <form method="GET" action="/admin/inventory" className="admin-tools-row">
          {filter !== "alles" ? <input type="hidden" name="filter" value={filter} /> : null}
          <input
            className="admin-search-input"
            type="search"
            name="q"
            defaultValue={qInput}
            placeholder="Zoek op naam, merk of categorie…"
            autoComplete="off"
            aria-label="Voorraad zoeken"
          />
          <button type="submit" className="admin-btn-primary">
            Zoeken
          </button>
        </form>
      </div>

      {rows.length === 0 ? (
        <p className="admin-muted admin-m-0">Geen producten in deze selectie.</p>
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
