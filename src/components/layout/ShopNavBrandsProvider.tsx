"use client";

import { createContext, useContext, type ReactNode } from "react";

import { brandSlugFromName, type ShopNavBrand } from "@/lib/brands-shared";
import { HOME_BRAND_LIST } from "@/lib/site-content";

const FALLBACK_BRANDS: ShopNavBrand[] = HOME_BRAND_LIST.map((name) => ({
  name,
  slug: brandSlugFromName(name),
}));

const ShopNavBrandsContext = createContext<ShopNavBrand[]>(FALLBACK_BRANDS);

export function ShopNavBrandsProvider({
  brands,
  children,
}: {
  brands: ShopNavBrand[];
  children: ReactNode;
}) {
  return (
    <ShopNavBrandsContext.Provider value={brands.length ? brands : FALLBACK_BRANDS}>
      {children}
    </ShopNavBrandsContext.Provider>
  );
}

export function useShopNavBrands(): ShopNavBrand[] {
  return useContext(ShopNavBrandsContext);
}
