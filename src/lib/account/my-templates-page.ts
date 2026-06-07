import type { TemplateRecord } from '~/lib/prompts/template-types';

export type MyTemplatesPage = {
  items: TemplateRecord[];
  total: number | null;
  hasMore: boolean;
};

export function myTemplatesPageKey(
  search: string,
  statusFilter: string,
  page: number,
  pageSize: number,
): string {
  return `${search.trim()}|${statusFilter}|${page}|${pageSize}`;
}

export function buildMyTemplatesQuery(
  search: string,
  statusFilter: string,
  page: number,
  pageSize: number,
): URLSearchParams {
  const q = new URLSearchParams();
  if (search.trim()) q.set('q', search.trim());
  if (statusFilter) q.set('status', statusFilter);
  q.set('limit', String(pageSize));
  q.set('offset', String((page - 1) * pageSize));
  return q;
}

export function parseMyTemplatesPage(
  data: { items?: TemplateRecord[]; total?: number; offset?: number },
  page: number,
  pageSize: number,
): MyTemplatesPage {
  const items = data.items ?? [];
  const total = typeof data.total === 'number' ? data.total : null;
  const offset = typeof data.offset === 'number' ? data.offset : (page - 1) * pageSize;
  return {
    items,
    total,
    hasMore: total != null ? offset + items.length < total : items.length >= pageSize,
  };
}
