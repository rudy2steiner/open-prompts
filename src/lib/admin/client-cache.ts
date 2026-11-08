import type { AdminEventRow, AdminGenerationRow, AdminSummary, AdminTab, AdminUserRow } from './monitor';

export type AdminMonitorData = {
  summary: AdminSummary;
  users: AdminUserRow[];
  generations: AdminGenerationRow[];
  events: AdminEventRow[];
  hasNext: boolean;
};

const key = (tab: AdminTab, page: number) => `${tab}:${page}`;

export function createAdminMonitorCache() {
  const pages = new Map<string, AdminMonitorData>();
  return {
    read(tab: AdminTab, page: number): AdminMonitorData | null {
      return pages.get(key(tab, page)) ?? null;
    },
    write(tab: AdminTab, page: number, data: AdminMonitorData): void {
      pages.set(key(tab, page), data);
    },
  };
}

export function createLatestAdminRequest() {
  let generation = 0;
  return {
    begin(): number {
      generation += 1;
      return generation;
    },
    isCurrent(candidate: number): boolean {
      return generation === candidate;
    },
  };
}
