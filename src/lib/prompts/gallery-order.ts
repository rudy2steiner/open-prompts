/** 日期倒序；相同日期保留原顺序，缺少日期的记录置后。 */
export function sortGalleryByDate<T extends { createdAt?: string }>(items: readonly T[]): T[] {
  return items.map((item,index) => ({ item, index, time: Date.parse(item.createdAt ?? '') }))
    .sort((a,b) => {
      const at = Number.isFinite(a.time) ? a.time : -Infinity;
      const bt = Number.isFinite(b.time) ? b.time : -Infinity;
      return at === bt ? a.index - b.index : bt > at ? 1 : -1;
    }).map(entry => entry.item);
}
