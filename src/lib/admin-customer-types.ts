export type AdminCustomerAddress = {
  id: string;
  label: string | null;
  line1: string;
  line2: string | null;
  postalCode: string;
  city: string;
  country: string;
  isDefault: boolean;
};

export type AdminCustomerDetail = {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  addresses: AdminCustomerAddress[];
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
  lastOrderNumber: string | null;
  lastOrderId: number | null;
};

export type AdminCustomerKindFilter = "all" | "account" | "guest";

export const ADMIN_CUSTOMER_KIND_FILTERS = ["all", "account", "guest"] as const;

export type AdminCustomerListItem = {
  id: string | null;
  kind: "account" | "guest";
  email: string | null;
  name: string;
  phone: string | null;
  city: string | null;
  createdAt: string | null;
  orderCount: number;
  totalSpent: number;
  currency: string;
  lastOrderAt: string | null;
  lastOrderNumber: string | null;
  lastOrderId: number | null;
  addressCount: number;
};

export type AdminCustomerDirectoryQuery = {
  q?: string;
  kind?: AdminCustomerKindFilter;
  city?: string;
  page?: number;
  pageSize?: number;
};

export type AdminCustomerDirectoryResult = {
  rows: AdminCustomerListItem[];
  accounts: AdminCustomerListItem[];
  guests: AdminCustomerListItem[];
  cities: string[];
  counts: { all: number; account: number; guest: number };
  total: number;
  totalPages: number;
  page: number;
  from: number;
  to: number;
};

export type AdminCustomerAddressWrite = {
  id?: string;
  label?: string | null;
  line1: string;
  line2?: string | null;
  postalCode: string;
  city: string;
  country?: string;
  isDefault?: boolean;
};
