import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { toGalleryPreview } from '../src/lib/prompts/gallery-preview';

test('first paint only carries visible cards without full prompt bodies', () => {
  const source = Array.from({ length: 25 }, (_, n) => ({ id: String(n), title: String(n), prompt: 'private-sized-long-public-text'.repeat(1000), images: ['https://example.com/cover.webp'], tags: [], description: '', model: 'GPT Image 2' }));
  const preview = toGalleryPreview(source);
  assert.equal(preview.length, 18);
  assert.ok(preview.every(p => p.prompt === ''));
  assert.ok(source[0].prompt.length > 1000);
  assert.equal(preview[0].images[0], source[0].images[0]);
  assert.ok(JSON.stringify(preview).length < 5000);
});

test('preview offsets are bounded integers and the end does not request another page', async () => {
  const { normalizeGalleryOffset, nextGalleryOffset } = await import('../src/lib/prompts/gallery-preview');
  assert.equal(normalizeGalleryOffset('18'), 18);
  for (const value of [-1, 1.5, '18oops', Infinity, undefined]) assert.equal(normalizeGalleryOffset(value), 0);
  assert.equal(nextGalleryOffset(18, 18, 50), 36);
  assert.equal(nextGalleryOffset(36, 14, 50), null);
  assert.equal(nextGalleryOffset(50, 0, 50), null);
});
