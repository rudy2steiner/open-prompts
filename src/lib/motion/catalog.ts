import { groupMotionModels } from './models';
import exclusions from '~/data/imports/motion-quality-exclusions.json';
// 完整正文仅由服务端页面和 API 使用；客户端只导入 types。
import previews from '~/data/imports/motion-preview-videos.json';
import snapshot from '~/data/imports/motion-popularity.json';
import { rankByPopularity } from './popularity';
import { buildMotionSlugs } from './slugs';
import records from '~/data/imports/motion-catalog.json';
import type { MotionDetail, MotionPage, MotionFacets, MotionSummary, MotionPopularity, MotionSort } from './types';

const slugs = buildMotionSlugs(records);
function popularityFor(id: string, sourceUrl: string): MotionPopularity {
  const works = snapshot.works as Record<string, { sourceUrl: string; likes: number | null; observedAt: string | null }>;
  const repositories = snapshot.repositories as Record<string, { sourceUrl: string; stars: number | null; observedAt: string | null; approximate?: boolean }>;
  const post = works[id];
  if (post?.sourceUrl === sourceUrl && post.likes !== null && Number.isSafeInteger(post.likes) && post.likes >= 0 && post.observedAt) {
    return { likes: post.likes, stars: null, observedAt: post.observedAt, scope: 'post', sourceUrl, approximate: false };
  }
  const parsed = new URL(sourceUrl);
  const repoKey = parsed.hostname === 'github.com' ? parsed.pathname.split('/').slice(1, 3).join('/') : null;
  const repo = repoKey ? repositories[repoKey] : null;
  if (repo && repo.sourceUrl === `https://github.com/${repoKey}` && repo.stars !== null && Number.isSafeInteger(repo.stars) && repo.stars >= 0 && repo.observedAt) {
    return { likes: null, stars: repo.stars, observedAt: repo.observedAt, scope: 'repository', sourceUrl: repo.sourceUrl, approximate: !!repo.approximate };
  }
  return { likes: null, stars: null, observedAt: null, scope: null, sourceUrl: null, approximate: false };
}
const previewById = previews as Record<string, { previewVideo: string; sourceVideo: string }>;
// 统一排除未通过媒体质量检查的条目，分页、分类、详情和站点地图共用。
const excludedIds = new Set(Object.keys(exclusions));
const catalog = records.filter(record => !!record.poster && !excludedIds.has(record.id)).map(record => ({ ...record, slug: slugs.get(record.id)!, previewVideo: previewById[record.id]?.sourceVideo === record.video ? previewById[record.id].previewVideo : null, popularity: popularityFor(record.id, record.sourceUrl) })) as MotionDetail[];
const modelGroups = groupMotionModels(catalog);
const byId = new Map(catalog.map(entry => [entry.id, entry]));
const bySlug = new Map(catalog.map(entry => [entry.slug, entry]));
export function getMotionSlugs() { return catalog.map(entry => entry.slug); }
export function getMotion(id: string) { return byId.get(id) || bySlug.get(id); }
function summarize({ id, slug, title, author, model, type, category, categories, sourceUrl, poster, video, previewVideo, width, height, popularity }: MotionDetail): MotionSummary {
  return { id, slug, title, author, model, type, category, categories, sourceUrl, poster, video, previewVideo, width, height, popularity };
}
export function getMotionSummary(id: string) {
  const entry = getMotion(id);
  return entry ? summarize(entry) : undefined;
}
export function getMotionFacets(): MotionFacets {
  const categories: Record<string, number> = {};
  for (const entry of catalog) categories[entry.category] = (categories[entry.category] || 0) + 1;
  return { total: catalog.length, categories, models: modelGroups.facets };
}
export function getMotionPage({ category = 'all', type = 'all', model = 'all', offset = 0, sort = 'likes' }: { category?: string; type?: string; model?: string; offset?: number; sort?: MotionSort } = {}): MotionPage {
  const start = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  const matches = catalog.filter(entry => (category === 'all' || entry.category === category) && (type === 'all' || entry.type === type) && (model === 'all' || modelGroups.byId.get(entry.id)!.includes(model)));
  const items = rankByPopularity(matches, sort).slice(start, start + 12).map(summarize);
  return { items, total: matches.length, nextOffset: start + items.length < matches.length ? start + items.length : null };
}
