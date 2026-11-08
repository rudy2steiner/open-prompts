import type {
  UserBillingSummary,
  UserBillingTab,
  UserCreditRow,
  UserGenerationRow,
  UserOrderRow,
} from './account-view';

export type BillingPageData = {
  summary: UserBillingSummary;
  orders: UserOrderRow[];
  credits: UserCreditRow[];
  generations: UserGenerationRow[];
  hasNext: boolean;
};

export function billingCacheKey(userId: string, tab: UserBillingTab, page: number): string {
  return `${userId}:${tab}:${page}`;
}

export function createBillingPageCache() {
  const pages = new Map<string, BillingPageData>();
  return {
    read(userId: string, tab: UserBillingTab, page: number): BillingPageData | null {
      return pages.get(billingCacheKey(userId, tab, page)) ?? null;
    },
    write(userId: string, tab: UserBillingTab, page: number, data: BillingPageData): void {
      pages.set(billingCacheKey(userId, tab, page), data);
    },
    clearForUser(userId: string): void {
      pages.forEach((_data, key) => {
        if (key.startsWith(`${userId}:`)) pages.delete(key);
      });
    },
  };
}

export function createLatestBillingRequest() {
  let generation = 0;
  return {
    begin(): number {
      generation += 1;
      return generation;
    },
    isCurrent(candidate: number): boolean {
      return candidate === generation;
    },
  };
}
