export type AdminProductSearchHit = {
  id: number;
  name: string;
  sku: string | null;
  image: string | null;
  price: number;
};

export type OrderLineCatalogInfo = {
  sku: string | null;
  image: string | null;
};
