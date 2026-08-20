import {
  ADMIN_CUSTOMER_KIND_FILTERS,
  type AdminCustomerDirectoryQuery,
  type AdminCustomerKindFilter,
} from "@/lib/admin-customer-types";

export function parseAdminCustomerKindFilter(value: string | undefined | null): AdminCustomerKindFilter {
  return ADMIN_CUSTOMER_KIND_FILTERS.includes(value as AdminCustomerKindFilter)
    ? (value as AdminCustomerKindFilter)
    : "all";
}

export function buildAdminCustomersQueryString(input: AdminCustomerDirectoryQuery): string {
  const params = new URLSearchParams();
  const q = input.q?.trim();
  if (q) {
    params.set("q", q);
  }
  if (input.kind && input.kind !== "all") {
    params.set("kind", input.kind);
  }
  const city = input.city?.trim();
  if (city) {
    params.set("city", city);
  }
  if (input.page && input.page > 1) {
    params.set("page", String(input.page));
  }
  return params.toString();
}
