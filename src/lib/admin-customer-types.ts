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

export type AdminCustomerListItem = {
  id: string | null;
  kind: "account" | "guest";
  email: string | null;
  name: string;
  phone: string | null;
  orderCount: number;
  totalSpent: number;
  currency: string;
  lastOrderAt: string | null;
  lastOrderNumber: string | null;
  lastOrderId: number | null;
  addressCount: number;
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
