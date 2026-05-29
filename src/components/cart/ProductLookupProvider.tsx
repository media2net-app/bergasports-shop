"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { Product } from "@/lib/products";

type ProductLookupContextValue = {
  getProductById: (id: number) => Product | undefined;
  prefetch: (ids: number[]) => void;
};

const ProductLookupContext = createContext<ProductLookupContextValue | null>(null);

export function ProductLookupProvider({ children }: { children: React.ReactNode }) {
  const [cache, setCache] = useState<Map<number, Product>>(() => new Map());
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const inflightRef = useRef<Set<number>>(new Set());

  const fetchIds = useCallback(async (ids: number[]) => {
    const missing = ids.filter((id) => !cacheRef.current.has(id) && !inflightRef.current.has(id));
    if (!missing.length) {
      return;
    }
    missing.forEach((id) => inflightRef.current.add(id));
    try {
      const res = await fetch(`/api/products/lookup?ids=${missing.join(",")}`, { cache: "no-store" });
      if (!res.ok) {
        return;
      }
      const body = (await res.json()) as { products?: Product[] };
      const list = body.products ?? [];
      if (!list.length) {
        return;
      }
      setCache((prev) => {
        const next = new Map(prev);
        for (const p of list) {
          next.set(p.id, p);
        }
        return next;
      });
    } finally {
      missing.forEach((id) => inflightRef.current.delete(id));
    }
  }, []);

  const prefetch = useCallback(
    (ids: number[]) => {
      void fetchIds(ids);
    },
    [fetchIds],
  );

  const getProductById = useCallback((id: number) => cache.get(id), [cache]);

  return (
    <ProductLookupContext.Provider value={{ getProductById, prefetch }}>
      {children}
    </ProductLookupContext.Provider>
  );
}

export function useProductLookup() {
  const ctx = useContext(ProductLookupContext);
  if (!ctx) {
    throw new Error("useProductLookup must be used inside ProductLookupProvider");
  }
  return ctx;
}
