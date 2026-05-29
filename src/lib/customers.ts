export type CustomerSummary = {
  key: string;
  name: string;
  email: string | null;
  phone: string;
  city: string | null;
  orderCount: number;
  totalSpent: number;
  currency: string;
  firstOrderAt: string;
  lastOrderAt: string;
  lastOrderId: number;
};

/** Stable id for URLs — digits from phone, or trimmed lowercase fallback. */
export function customerKeyFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits || phone.trim().toLowerCase();
}
