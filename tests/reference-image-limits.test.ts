import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { isModelComingSoon, referenceImageLimit } from '../src/lib/generation/capabilities';
import { atlasModelSlug, quoteImageCredits } from '../src/lib/billing/quotes';

const limits: Array<[string, number]> = [
  ['GPT Image 2.6 Sunburst', 16],
  ['GPT Image 2.6 Flare', 16],
  ['GPT Image 2.5 Sunburst', 16],
  ['GPT Image 2.5 Flare', 16],
  ['GPT Image 2', 10],
  ['Nano Banana 2', 14],
];

for (const [model, max] of limits) {
  test(`${model}: official image-input limit also applies to its provider slug`, () => {
    assert.equal(referenceImageLimit(model), max);
    assert.equal(referenceImageLimit(atlasModelSlug(model, 'edit')!), max);
  });
}

test('Nano Banana is coming soon while every GPT variant remains available', () => {
  assert.equal(isModelComingSoon('Nano Banana 2'), true);
  assert.equal(isModelComingSoon('google/nano-banana-2/text-to-image'), true);
  assert.equal(isModelComingSoon('google/nano-banana-2/edit'), true);
  for (const [model] of limits.filter(([model]) => model.startsWith('GPT'))) {
    assert.equal(isModelComingSoon(model), false);
  }
});

test('unknown model image limits are not guessed', () => {
  assert.equal(referenceImageLimit('Unknown Model'), null);
});

test('image-only reference generation routes through edit, not text-to-image or video reference', () => {
  assert.equal(atlasModelSlug('GPT Image 2', 'reference'), 'openai/gpt-image-2/edit');
  assert.equal(atlasModelSlug('Nano Banana 2', 'reference'), 'google/nano-banana-2/edit');
  assert.deepEqual(quoteImageCredits({ model: 'GPT Image 2.5 Flare', path: 'reference', quality: '1k', width: 1024, height: 1024, count: 1 }), { slug: 'openai/gpt-image-2.5-flare/edit', credits: 2 });
  assert.deepEqual(quoteImageCredits({ model: 'GPT Image 2', path: 'reference', quality: '2k', width: 1024, height: 1024, count: 1 }), { slug: 'openai/gpt-image-2/edit', credits: 6 }, 'reference uses the same commercial tariff as text generation');
});
