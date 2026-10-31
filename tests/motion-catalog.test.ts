import type { MotionSummary } from '../src/lib/motion/types';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { getMotion, getMotionPage, getMotionFacets, getMotionSummary } from '../src/lib/motion/catalog';

test('catalog contains only approved works and preserves existing detail IDs', () => {
  assert.equal(getMotionFacets().total, 1153);
  assert.ok(getMotion('motion-showreel')?.prompt.includes('soundtrack'));
  assert.equal(getMotion('does-not-exist'), undefined);
});

test('pages contain summaries only and advance without duplicates', () => {
  const first = getMotionPage({});
  const next = getMotionPage({ offset: first.nextOffset! });
  assert.equal(first.items.length, 12);
  assert.equal(first.nextOffset, 12);
  assert.equal(new Set([...first.items, ...next.items].map(e => e.id)).size, 24);
  assert.ok(first.items.every(e => !('prompt' in e) && !('provenance' in e)));
});

test('filters apply before pagination and invalid categories return no results', () => {
  const page = getMotionPage({ category: 'product-brand', type: 'Skill' });
  assert.ok(page.items.length > 0);
  assert.ok(page.items.every(e => e.category === 'product-brand' && e.type === 'Skill'));
  assert.equal(getMotionPage({ category: 'invalid' }).total, 0);
  assert.equal(getMotionPage({ offset: 2000 }).nextOffset, null);
});

test('preview fields use local images on the final page too', () => {
  const hero = getMotion('motion-showreel')!;
  assert.ok(hero.poster?.startsWith('/motion-posters/'));
  assert.ok(hero.video);
  const last = getMotionPage({ offset: 1152 });
  assert.ok(last.items.length > 0);
  assert.ok(last.items.every(e => e.poster?.startsWith('/motion-posters/')));
});

test('hero preview does not serialize the full prompt', () => {
  assert.ok(getMotionSummary('motion-showreel'));
  assert.equal('prompt' in getMotionSummary('motion-showreel')!, false);
});

test('numeric source IDs resolve to readable canonical slugs without breaking old links', () => {
  const entry = getMotion('2103802871934497266')!;
  assert.equal(entry.slug, 'wireframe-to-shards-logo-reveal');
  assert.equal(getMotion(entry.slug)?.id, entry.id);
  const slugs: string[] = [];
  let offset: number | null = 0;
  while (offset !== null) {
    const page = getMotionPage({ offset });
    slugs.push(...page.items.map(e => e.slug));
    offset = page.nextOffset;
  }
  assert.equal(new Set(slugs).size, 1153);
});

test('reported logo reveal uses the native video belonging to that source post', () => {
  const entry = getMotion('wireframe-to-shards-logo-reveal')!;
  assert.ok(entry.video?.includes('/2103802493985808384/'));
  assert.ok(entry.poster?.startsWith('/motion-posters/'));
});

test('duplicate-title slugs are stable when import order changes', async () => {
  const { buildMotionSlugs } = await import('../src/lib/motion/slugs');
  const records = [{ id: '123', title: 'Motion Showreel' }, { id: '456', title: 'Motion Showreel' }];
  const forward = buildMotionSlugs(records);
  const reverse = buildMotionSlugs([...records].reverse());
  assert.equal(forward.get('123'), reverse.get('123'));
  assert.equal(forward.get('456'), reverse.get('456'));
  assert.notEqual(forward.get('123'), forward.get('456'));
});


test('excluded works never appear in pages, facets or details', () => {
  assert.equal(getMotion('overthinking'), undefined);
  assert.equal(getMotion('2103847584531956105'), undefined);
  const entries: MotionSummary[] = [];
  let offset: number | null = 0;
  while (offset !== null) {
    const page = getMotionPage({ offset });
    entries.push(...page.items);
    offset = page.nextOffset;
  }
  assert.equal(entries.length, getMotionFacets().total);
  assert.ok(entries.every(entry => entry.poster?.startsWith('/motion-posters/')));
});

test('model filters include comparisons, combine with categories and paginate consistently', async () => {
  const { motionModels } = await import('../src/lib/motion/models');
  assert.deepEqual(motionModels('Opus 5.5 / GPT-6 Astra'), ['Claude', 'GPT']);
  assert.deepEqual(motionModels('Model-agnostic motion direction'), ['Other']);
  const facets = getMotionFacets();
  for (const model of ['Claude', 'GPT', 'Other']) {
    const page = getMotionPage({ model });
    assert.equal(page.total, facets.models[model]);
    assert.ok(page.items.length > 0);
    if (model === 'Claude') assert.ok(page.items.every(entry => motionModels(entry.model).includes('Claude')));
  }
  const page = getMotionPage({ model: 'Claude', category: 'explainers-data' });
  assert.ok(page.items.length > 0);
  assert.ok(page.items.every(entry => entry.category === 'explainers-data' && motionModels(entry.model).includes('Claude')));
  assert.equal(getMotionPage({ model: 'invalid' }).total, 0);
});


test('October 24 batch preserves prompt completeness and promotes the reviewed treasure map', () => {
  const map = getMotion('2113248976984068329')!;
  assert.ok(map.prompt.includes('Using these four references'));
  assert.equal(map.requiresReference, true);
  assert.equal(map.promptStatus, 'upstream_full_transcription');
  assert.ok(map.poster?.startsWith('/motion-posters/'));
  assert.ok(map.previewVideo?.startsWith('/motion-previews/'));
  assert.equal(getMotionPage({ sort: 'curated' }).items[0].id, map.id);
  assert.equal(getMotion('2109957002822889591')?.promptStatus, 'upstream_brief_transcription');
});
