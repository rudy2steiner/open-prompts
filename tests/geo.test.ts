import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { GEO_PATH, geoCopy } from '../src/lib/geo/facts';
import { llmsFullTxt, llmsTxt } from '../src/lib/geo/llms';
import { geoJsonLd } from '../src/lib/geo/page-copy';

test('geo brief cites the real libraries and does not invent a price page', () => {
  const brief = llmsTxt();
  const full = llmsFullTxt();
  assert.match(brief, /public library of AI image prompts and motion prompts/);
  assert.match(brief, /\/image-prompts/);
  assert.match(brief, /\/motion-prompts/);
  assert.match(brief, new RegExp(GEO_PATH));
  assert.doesNotMatch(full, /\/pricing/);
  assert.doesNotMatch(full, /\$\d/);
});

test('geo page json-ld matches the visible definition and faq', () => {
  const copy = geoCopy('en');
  const graph = geoJsonLd('en')['@graph'] as { '@type': string; description?: string; mainEntity?: { name: string }[] }[];
  const page = graph.find((node) => node['@type'] === 'WebPage');
  const faq = graph.find((node) => node['@type'] === 'FAQPage');
  assert.equal(page?.description, copy.definition);
  assert.deepEqual(
    faq?.mainEntity?.map((item) => item.name),
    copy.faqs.map((item) => item.q),
  );
});
