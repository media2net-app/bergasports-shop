"use client";

import { useEffect, useState, type ReactNode } from "react";

import {
  CategoriesProvider,
  type CategoriesContextValue,
} from "@/components/categories/CategoriesProvider";
import type { RalexCategoriesFile } from "@/lib/ralex-categories";

const EMPTY: CategoriesContextValue = {
  tree: [],
  meta: { source: "", fetchedAt: "", totalCategories: 0 },
};

/** Loads category tree after first paint — keeps root layout off the DB critical path (mobile FCP/LCP). */
export default function CategoriesProviderDeferred({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<CategoriesContextValue>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/shop/categories", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RalexCategoriesFile | null) => {
        if (cancelled || !data?.tree) {
          return;
        }
        setValue({
          tree: data.tree,
          meta: {
            source: data.source,
            fetchedAt: data.fetchedAt,
            totalCategories: data.totalCategories,
          },
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return <CategoriesProvider value={value}>{children}</CategoriesProvider>;
}
