import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { renderToStaticMarkup } from 'react-dom/server';
import { PromptGalleryMasonry } from '../src/components/prompt-gallery/PromptGalleryMasonry';
import { CoverImage } from '../src/components/prompt-gallery/CoverImage';

test('server markup is already a responsive column waterfall, with no grid-to-absolute handoff', () => {
  const html = renderToStaticMarkup(<PromptGalleryMasonry items={['a','b']} itemKey={x=>x} renderItem={x=><article>{x}</article>} />);
  assert.ok(html.includes('data-gallery-initial-layout="columns"'));
  assert.ok(!html.includes('grid-template-columns'));
  assert.ok(!html.match(/data-gallery-item[^>]+style="[^"]*translate3d/));
  assert.ok(!html.includes('visibility:hidden'));
});
test('natural covers can acquire their real aspect before React loads', () => {
  const html = renderToStaticMarkup(<CoverImage src="https://example.com/cover.webp" alt="cover" sizes="100vw" naturalAspectRatio="0.75" />);
  assert.ok(html.includes('height:auto'));
  assert.ok(html.includes('aspect-ratio:auto 0.75'));
  assert.ok(!html.includes('position:absolute'));
});

test('remote gallery covers do not send the page referrer', () => {
  const html = renderToStaticMarkup(
    <CoverImage src="https://pbs.twimg.com/media/example.jpg?name=medium" alt="cover" sizes="100vw" />,
  );
  assert.match(html, /referrerpolicy="no-referrer"/i);
});
