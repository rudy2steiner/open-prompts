import type { MotionSummary } from '../src/lib/motion/types';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { rankByPopularity } from '../src/lib/motion/popularity';

const record = (id: string, likes: number | null, stars: number | null = null) => ({ id, popularity: { likes, stars } });
test('likes sort is descending, zero is measured, unknown is last', () => {
  const result = rankByPopularity([record('unknown', null), record('zero', 0), record('high', 100), record('low', 4)], 'likes');
  assert.deepEqual(result.map(e => e.id), ['high', 'low', 'zero', 'unknown']);
});
test('repository stars are never counted as post likes', () => {
  const records = [record('repo', null, 50000), record('post', 1)];
  assert.deepEqual(rankByPopularity(records, 'likes').map(e => e.id), ['post', 'repo']);
  assert.deepEqual(rankByPopularity(records, 'stars').map(e => e.id), ['repo', 'post']);
});
test('ties preserve curated order and sorting does not mutate the catalog', () => {
  const records = [record('b', 3), record('a', 3), record('missing', null)];
  assert.deepEqual(rankByPopularity(records, 'likes').map(e => e.id), ['b', 'a', 'missing']);
  assert.deepEqual(records.map(e => e.id), ['b', 'a', 'missing']);
});
test('invalid metrics are treated as unknown instead of distorting rank', () => {
  const records = [record('negative', -2), record('infinity', Infinity), record('zero', 0)];
  assert.equal(rankByPopularity(records, 'likes')[0].id, 'zero');
});

test('live catalog sorts the whole filtered result before slicing pages', async () => {
  const { getMotionPage } = await import('../src/lib/motion/catalog');
  const records: MotionSummary[] = [];
  let offset: number | null = 0;
  while (offset !== null) {
    const page = getMotionPage({ sort: 'likes', offset });
    records.push(...page.items);
    offset = page.nextOffset;
  }
  assert.equal(records.length, 1153);
  assert.equal(new Set(records.map(e => e.id)).size, 1153);
  let previous = Infinity, unknown = false;
  for (const entry of records) {
    if (entry.popularity.likes === null) { unknown = true; continue; }
    assert.equal(unknown, false);
    assert.ok(entry.popularity.likes <= previous);
    previous = entry.popularity.likes;
    assert.equal(entry.popularity.scope, 'post');
    assert.equal(entry.popularity.sourceUrl, entry.sourceUrl);
    assert.ok(Number.isFinite(Date.parse(entry.popularity.observedAt!)));
  }
  const stars = getMotionPage({ sort: 'stars' });
  const known = stars.items.filter(e => e.popularity.stars !== null);
  assert.ok(known.length > 0);
  assert.ok(known.every(e => e.popularity.scope === 'repository' && e.popularity.likes === null));
});
