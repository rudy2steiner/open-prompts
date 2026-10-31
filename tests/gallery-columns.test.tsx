import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderToStaticMarkup } from 'react-dom/server';
import { PromptGalleryMasonry } from '../src/components/prompt-gallery/PromptGalleryMasonry';
import { CoverImage } from '../src/components/prompt-gallery/CoverImage';

test('gallery uses its original shortest-column masonry with visible server-rendered cards', () => {
  const html = renderToStaticMarkup(<PromptGalleryMasonry items={Array.from({length: 36}, (_, i) => String(i))} itemKey={i => i} renderItem={i => <article>{i}</article>} />);
  assert.ok(!html.includes('visibility:hidden'));
  assert.ok(!html.includes('independent-columns'));
  assert.ok(html.includes('data-gallery-initial-layout="columns"'));
  assert.ok(!html.includes('grid-template-columns'));
  assert.equal(html.split('<article>').length - 1, 36);
});
test('cover pixels do not wait for a React onLoad handler to become visible', () => {
  const html = renderToStaticMarkup(<CoverImage src="https://example.com/cover.webp" alt="cover" sizes="100vw" />);
  assert.ok(html.includes('<img'));
  assert.ok(!html.includes('opacity-0'));
});
