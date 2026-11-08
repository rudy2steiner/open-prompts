import { createStaleCache } from '~/lib/cache/stale-while-revalidate';

export type AdminCacheNamespace = 'users' | 'templates' | 'review' | 'orders' | 'generations' | 'events';

export type AdminQueryKeyInput = {
  namespace: AdminCacheNamespace;
  tab?: string;
  page?: number;
  pageSize?: number;
  offset?: number;
  query?: string;
  status?: string;
  visibility?: string;
  trendDays?: number;
};

export function adminQueryKey(input: AdminQueryKeyInput): string {
  const params = new URLSearchParams();
  if (input.tab) params.set('tab', input.tab);
  if (input.page !== undefined) params.set('page', String(input.page));
  if (input.pageSize !== undefined) params.set('pageSize', String(input.pageSize));
  if (input.offset !== undefined) params.set('offset', String(input.offset));
  if (input.query?.trim()) params.set('query', input.query.trim());
  if (input.status) params.set('status', input.status);
  if (input.visibility) params.set('visibility', input.visibility);
  if (input.trendDays !== undefined) params.set('trendDays', String(input.trendDays));
  const query = params.toString();
  return query ? `${input.namespace}:${query}` : `${input.namespace}:`;
}

export function createAdminCacheSet(now: () => number = Date.now) {
  const summary = createStaleCache<unknown>({ freshMs: 30_000, staleMs: 5 * 60_000, now });
  const pages = createStaleCache<unknown>({ freshMs: 15_000, staleMs: 2 * 60_000, now });
  return {
    cachedSummary<T>(loader: () => Promise<T>): Promise<T> {
      return summary.get('summary', loader) as Promise<T>;
    },
    cachedPage<T>(key: string, loader: () => Promise<T>): Promise<T> {
      return pages.get(key, loader) as Promise<T>;
    },
    invalidate(namespace?: AdminCacheNamespace): void {
      summary.clear();
      if (namespace) pages.invalidatePrefix(`${namespace}:`);
      else pages.clear();
    },
  };
}

const adminCaches = createAdminCacheSet();

export function cachedAdminSummary<T>(loader: () => Promise<T>): Promise<T> {
  return adminCaches.cachedSummary(loader);
}

export function cachedAdminPage<T>(key: string, loader: () => Promise<T>): Promise<T> {
  return adminCaches.cachedPage(key, loader);
}

export function invalidateAdminCache(namespace?: AdminCacheNamespace): void {
  adminCaches.invalidate(namespace);
}
