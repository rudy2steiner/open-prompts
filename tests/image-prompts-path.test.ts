import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { galleryHref } from '../src/lib/prompts/gallery-path';
import { promptBreadcrumbLabel, promptHref } from '../src/lib/prompts/seo-paths';

test('image prompt links use the new localized route and retain filters', () => {
  assert.equal(galleryHref('en'), '/image-prompts');
  assert.equal(galleryHref('zh'), '/zh/image-prompts');
  assert.equal(galleryHref('ja'), '/ja/image-prompts');
  assert.equal(galleryHref('zh', {model: 'GPT Image 2'}), '/zh/image-prompts?model=GPT+Image+2');
});
test('breadcrumb label drops the generated slug suffix', () => {
  assert.equal(promptBreadcrumbLabel('candid-street-fashion-4e88f95c'), 'candid-street-fashion');
  assert.equal(promptBreadcrumbLabel('top-10'), 'top-10');
});
test('image prompt details use the image-prompts path', () => {
  assert.equal(promptHref('en', 'vintage-travel-poster'), '/image-prompts/vintage-travel-poster');
  assert.equal(promptHref('zh', 'vintage-travel-poster'), '/zh/image-prompts/vintage-travel-poster');
});
test('legacy gallery routes permanently redirect to the matching image prompt route', async () => {
  const config = (await import('../next.config.mjs')).default;
  assert.ok(config.redirects);
  const redirects = await config.redirects();
  for (const [source, destination] of [['/gallery','/image-prompts'], ['/en/gallery','/en/image-prompts'], ['/zh/gallery','/zh/image-prompts'], ['/ja/gallery','/ja/image-prompts'], ['/prompt/:slug','/image-prompts/:slug'], ['/zh/prompt/:slug','/zh/image-prompts/:slug'], ['/ja/prompt/:slug','/ja/image-prompts/:slug']]) {
    assert.ok(redirects.some(route => route.source === source && route.destination === destination && route.permanent === true));
  }
});
