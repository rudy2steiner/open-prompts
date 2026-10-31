import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { MotionMasonry } from '../src/app/[locale]/motion-prompts/MotionMasonry';

const render = (items: string[]) => renderToStaticMarkup(<MotionMasonry items={items} itemKey={item => item} renderItem={item => <article>{item}</article>} />);
test('motion cards render visibly and once before scripts', () => {
  const html = render(['a', 'b']);
  assert.ok(!html.includes('visibility:hidden'));
  assert.ok(!html.includes('absolute'));
  assert.ok(html.includes('independent-columns-surface'));
  assert.equal(html.split('<article>a</article>').length - 1, 1);
});
test('all loaded motion cards share independent columns without batch height barriers', () => {
  const html = render(Array.from({length: 36}, (_, i) => String(i)));
  assert.equal(html.split('class="independent-columns-surface"').length - 1, 1);
  assert.ok(!html.includes('motion-masonry-batch'));
  assert.equal(html.split('class="independent-columns-item"').length - 1, 36);
});
