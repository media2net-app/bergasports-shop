"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Product, WcVariationJson } from "@/lib/products";
import { sortVariationsForDisplay } from "@/lib/wc-variations";

type ProductVariationContextValue = {
  variations: WcVariationJson[] | undefined;
  selectedId: number | null;
  setSelectedId: (id: number | null) => void;
  selected: WcVariationJson | undefined;
  highlightImage: string | undefined;
};

const ProductVariationContext = createContext<ProductVariationContextValue | null>(null);

function resolveInitialSelectedId(
  variations: WcVariationJson[] | undefined,
  initialVariationId?: number,
): number | null {
  const sorted = sortVariationsForDisplay(variations) ?? [];
  if (sorted.length === 0) {
    return null;
  }
  if (sorted.length === 1) {
    return sorted[0].id;
  }
  if (initialVariationId != null && sorted.some((v) => v.id === initialVariationId)) {
    return initialVariationId;
  }
  return null;
}

type ProductVariationProviderProps = {
  product: Product;
  initialVariationId?: number;
  children: ReactNode;
};

export function ProductVariationProvider({
  product,
  initialVariationId,
  children,
}: ProductVariationProviderProps) {
  const variations = useMemo(
    () => sortVariationsForDisplay(product.wcVariations),
    [product.wcVariations],
  );

  const [selectedId, setSelectedIdState] = useState<number | null>(() =>
    resolveInitialSelectedId(variations, initialVariationId),
  );
  const prevProductIdRef = useRef(product.id);

  useEffect(() => {
    const sorted = variations ?? [];
    if (sorted.length === 0) {
      setSelectedIdState(null);
      return;
    }
    if (sorted.length === 1) {
      setSelectedIdState(sorted[0].id);
      return;
    }
    const productChanged = prevProductIdRef.current !== product.id;
    prevProductIdRef.current = product.id;

    if (initialVariationId != null && sorted.some((v) => v.id === initialVariationId)) {
      setSelectedIdState(initialVariationId);
      return;
    }
    if (productChanged) {
      setSelectedIdState(null);
    }
  }, [initialVariationId, product.id, variations]);

  const setSelectedId = useCallback((id: number | null) => {
    setSelectedIdState(id);
  }, []);

  const selected = variations?.find((v) => v.id === selectedId);
  const highlightImage = selected?.image?.trim() || undefined;

  const value = useMemo(
    (): ProductVariationContextValue => ({
      variations,
      selectedId,
      setSelectedId,
      selected,
      highlightImage,
    }),
    [variations, selectedId, setSelectedId, selected, highlightImage],
  );

  return (
    <ProductVariationContext.Provider value={value}>{children}</ProductVariationContext.Provider>
  );
}

export function useProductVariation(): ProductVariationContextValue | null {
  return useContext(ProductVariationContext);
}
