import type { PromptGalleryItem } from '~/data/promptGallery';

/** 卡片不使用提示词正文；完整搜索目录仅在搜索或筛选时加载。 */
export function toGalleryPreview(items: PromptGalleryItem[], limit = 18): PromptGalleryItem[] {
  return items.slice(0, limit).map(item => ({ ...item, prompt: '' }));
}

export function normalizeGalleryOffset(value: unknown): number {
  const offset = Number(value);
  return Number.isSafeInteger(offset) && offset >= 0 ? offset : 0;
}

export function nextGalleryOffset(offset: number, count: number, total: number): number | null {
  return count > 0 && offset + count < total ? offset + count : null;
}
