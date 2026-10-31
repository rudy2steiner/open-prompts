import type { MotionSort } from './types';

type RankedEntry = { popularity: { likes: number | null; stars: number | null } };
const valid = (value: number | null) => value !== null && Number.isFinite(value) && value >= 0;
/** 只在同一种指标内比较；测得的零先于未知，平分保留精选顺序。 */
export function rankByPopularity<T extends RankedEntry>(entries: readonly T[], metric: MotionSort): T[] {
  if (metric === 'curated') return [...entries];
  const field = metric === 'stars' ? 'stars' : 'likes';
  return entries.map((entry, order) => ({ entry, order })).sort((a, b) => {
    const av = a.entry.popularity[field];
    const bv = b.entry.popularity[field];
    const knownA = valid(av), knownB = valid(bv);
    if (knownA !== knownB) return knownA ? -1 : 1;
    return knownA && knownB && av !== bv ? bv! - av! : a.order - b.order;
  }).map(({ entry }) => entry);
}
