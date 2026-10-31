import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { galleryHref } from '../src/lib/prompts/gallery-path';

test('image prompt links use the new localized route and retain filters', () => {
  assert.equal(galleryHref('en'), '/image-prompts');
  assert.equal(galleryHref('zh'), '/zh/image-prompts');
  assert.equal(galleryHref('ja'), '/ja/image-prompts');
  assert.equal(galleryHref('zh', {model: 'GPT Image 2'}), '/zh/image-prompts?model=GPT+Image+2');
});
test('legacy gallery routes permanently redirect to the matching image prompt route', async () => {
  const config = (await import('../next.config.mjs')).default;
  assert.ok(config.redirects);
  const redirects = await config.redirects();
  for (const [source, destination] of [['/gallery','/image-prompts'], ['/en/gallery','/en/image-prompts'], ['/zh/gallery','/zh/image-prompts'], ['/ja/gallery','/ja/image-prompts']]) {
    assert.ok(redirects.some(route => route.source === source && route.destination === destination && route.permanent === true));
  }
});
