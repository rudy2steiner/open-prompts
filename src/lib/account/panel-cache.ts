export function accountListQueryKey(input: {
  namespace: 'my-templates' | 'admin-templates' | 'admin-users';
  search?: string;
  status?: string;
  page: number;
  pageSize: number;
  trendDays?: number;
}): string {
  const query = new URLSearchParams();
  if (input.search?.trim()) query.set('search', input.search.trim());
  if (input.status) query.set('status', input.status);
  query.set('page', String(input.page));
  query.set('pageSize', String(input.pageSize));
  if (input.trendDays !== undefined) query.set('trendDays', String(input.trendDays));
  return `${input.namespace}:${query}`;
}

export function createAccountListCache<T>() {
  const entries = new Map<string, { data: T; updatedAt: number }>();
  return {
    read(key: string) {
      return entries.get(key) ?? null;
    },
    write(key: string, data: T, updatedAt = Date.now()): void {
      entries.set(key, { data, updatedAt });
    },
    clear(): void {
      entries.clear();
    },
  };
}

export function createLatestAccountRequest() {
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
