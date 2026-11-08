import { promptMatchesGalleryFilter, type SubmitCategoryKey } from '~/lib/prompts/prompt-categories';

export type BatchPrompt = {
  id: string;
  title: string;
  description?: string;
  prompt: string;
  model: string;
  tags: readonly string[];
  category?: string | null;
};

export function selectBatchDownload<T extends BatchPrompt>(items: readonly T[], input: {
  limit: number | null;
  query?: string;
  model?: string;
  category?: 'all' | SubmitCategoryKey;
  tag?: string | null;
  ids?: readonly string[] | null;
}): T[] {
  const limit = input.limit === null ? null : Math.floor(input.limit);
  if (limit !== null && limit < 1) return [];
  const allowed = input.ids == null ? null : new Set(input.ids.filter((id) => id.length > 0));
  const query = input.query?.trim().toLowerCase() ?? '';
  const model = input.model && input.model !== 'all' ? input.model : null;
  const category = input.category ?? 'all';
  const matched = items.filter((item) => {
    if (allowed && !allowed.has(item.id)) return false;
    if (model && item.model !== model) return false;
    if (!promptMatchesGalleryFilter(item, category, input.tag ?? null)) return false;
    if (!query) return true;
    return item.title.toLowerCase().includes(query)
      || (item.description ?? '').toLowerCase().includes(query)
      || item.prompt.toLowerCase().includes(query)
      || item.tags.some((tag) => tag.toLowerCase().includes(query));
  });
  return limit === null ? matched : matched.slice(0, limit);
}

/** 套餐额度是账号累计可获得的不同提示词数。重复下载已获得的不占额度。 */
export function applyDownloadQuota(input: {
  requestedIds: readonly string[];
  ownedIds: readonly string[];
  limit: number | null;
}): { allowed: string[]; newIds: string[]; remaining: number | null; exceeded: boolean } {
  const owned = new Set(input.ownedIds);
  const seen = new Set<string>();
  const requested = input.requestedIds.filter((id) => id.length > 0 && !seen.has(id) && seen.add(id));
  const fresh = requested.filter((id) => !owned.has(id));
  if (input.limit === null) return { allowed: requested, newIds: fresh, remaining: null, exceeded: false };
  const remaining = Math.max(0, Math.floor(input.limit) - owned.size);
  if (fresh.length > remaining) return { allowed: [], newIds: [], remaining, exceeded: true };
  return { allowed: requested, newIds: fresh, remaining, exceeded: false };
}
