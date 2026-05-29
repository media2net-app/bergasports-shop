"use client";

import { createContext, useContext } from "react";
import type { RalexCategoryNode } from "@/lib/ralex-categories";

export type CategoriesContextValue = {
  tree: RalexCategoryNode[];
  meta: { source: string; fetchedAt: string; totalCategories: number };
};

const CategoriesContext = createContext<CategoriesContextValue | null>(null);

export function CategoriesProvider({
  value,
  children,
}: {
  value: CategoriesContextValue;
  children: React.ReactNode;
}) {
  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

const EMPTY: CategoriesContextValue = {
  tree: [],
  meta: { source: "", fetchedAt: "", totalCategories: 0 },
};

export function useCategories(): CategoriesContextValue {
  const ctx = useContext(CategoriesContext);
  return ctx ?? EMPTY;
}
