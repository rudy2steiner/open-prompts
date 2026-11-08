import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { decideGeneration, generateButtonCredits, shouldOpenPricing } from '../src/lib/billing/generation-charge';
import { approximateImageCount, atlasModelSlug, packImageCounts, quoteImageCredits, STARTER_CREDIT_MATRIX } from '../src/lib/billing/quotes';
import { GenerateCreditButton } from '../src/components/generation/GenerateCreditButton';
import { GenerationBillingPrompt, generationBillingOffer } from '../src/components/generation/GenerationBillingPrompt';
import { emptyCreditAccount } from '../src/lib/billing/ledger';
import { GenerateModal } from '../src/components/generation/GenerateModal';
import { NextIntlClientProvider } from 'next-intl';
import { SessionProvider } from 'next-auth/react';
import type { PromptGalleryItem } from '../src/data/promptGallery';
import zh from '../messages/zh.json';
import en from '../messages/en.json';

const now = Date.parse('2026-11-07T00:00:00Z');
const flare = { model: 'GPT Image 2.5 Flare', path: 'edit' as const, quality: '1k', width: 1024, height: 1024, count: 1 };
const paths = ['text-to-image', 'reference', 'edit'] as const;
const models = [
  ['GPT Image 2', 'openai/gpt-image-2', 1],
  ['GPT Image 2.5 Sunburst', 'openai/gpt-image-2.5-sunburst', 1],
  ['GPT Image 2.5 Flare', 'openai/gpt-image-2.5-flare', 0.5],
  ['GPT Image 2.6 Sunburst', 'openai/gpt-image-2.6-sunburst', 1.5],
  ['GPT Image 2.6 Flare', 'openai/gpt-image-2.6-flare', 0.75],
] as const;
const dimensions = [
  [1024, 1024, 1], [1536, 768, 1], [1536, 864, 1], [1536, 1024, 1], [1024, 768, 1],
  [1280, 1024, 1], [864, 1536, 1], [768, 1024, 1], [1024, 1536, 1], [1024, 1280, 1],
  [2048, 2048, 2], [2048, 1024, 2], [2048, 1152, 2], [2048, 1360, 2], [2048, 1536, 2],
  [2048, 1632, 2], [1152, 2048, 2], [1536, 2048, 2], [1360, 2048, 2], [1632, 2048, 2],
  [3840, 2160, 4], [2160, 3840, 4],
] as const;

test('all 3960 selectable GPT combinations share the published tariff with the button and debit', () => {
  let checked = 0;
  for (const [model, base, modelRate] of models) for (const path of paths) {
    for (const [quality, qualityRate] of [['low', 1], ['medium', 3], ['high', 12]] as const) {
      for (const [width, height, resolutionRate] of dimensions) for (const count of [1, 2, 3, 4]) {
        const credits = Math.max(2, Math.ceil(2 * modelRate * qualityRate * resolutionRate)) * count;
        const slug = `${base}/${path === 'text-to-image' ? 'text-to-image' : 'edit'}`;
        const input = { model, path, quality, width, height, count };
        assert.deepEqual(quoteImageCredits(input), { slug, credits }, JSON.stringify(input));
        assert.deepEqual(quoteImageCredits({ ...input, model: slug }), { slug, credits });
        assert.equal(generateButtonCredits(input), credits);
        const decision = decideGeneration({ ...input, byok: false, ownerId: 'user-1', account: { ...emptyCreditAccount(), purchasedBalance: 1000 }, hasReference: path !== 'text-to-image', now });
        assert.equal(decision.action, 'charge');
        if (decision.action === 'charge') {
          assert.equal(decision.credits, credits);
          assert.equal(decision.slug, slug);
          assert.equal(1000 - decision.account.purchasedBalance, credits);
        }
        checked++;
      }
    }
  }
  assert.equal(checked, 3960);
});

test('fixed examples apply the minimum and per-image rounding before quantity in every mode', () => {
  const examples = [
    ['GPT Image 2', 'low', 1024, 1024, 1, 2],
    ['GPT Image 2', 'medium', 1024, 1024, 1, 6],
    ['GPT Image 2', 'medium', 2048, 2048, 4, 48],
    ['GPT Image 2.5 Flare', 'low', 1024, 1024, 1, 2],
    ['GPT Image 2.5 Flare', 'low', 2048, 2048, 1, 2],
    ['GPT Image 2.5 Flare', 'low', 3840, 2160, 1, 4],
    ['GPT Image 2.6 Sunburst', 'low', 1024, 1024, 1, 3],
    ['GPT Image 2.6 Sunburst', 'medium', 1024, 1024, 1, 9],
    ['GPT Image 2.6 Sunburst', 'high', 3840, 2160, 4, 576],
    ['GPT Image 2.6 Flare', 'medium', 1024, 1024, 1, 5],
    ['GPT Image 2.6 Flare', 'medium', 1024, 1024, 4, 20],
    ['GPT Image 2.6 Flare', 'medium', 2048, 2048, 1, 9],
  ] as const;
  for (const [model, quality, width, height, count, credits] of examples) for (const path of paths) {
    assert.equal(quoteImageCredits({ model, quality, width, height, count, path })?.credits, credits);
  }
  for (const [quality, credits] of [['1k', 2], ['2k', 6], ['4k', 24]] as const) {
    assert.equal(quoteImageCredits({ ...flare, model: 'GPT Image 2', quality })?.credits, credits);
  }
});

test('unknown models, malformed modes, qualities, dimensions and counts cannot acquire a tariff', () => {
  for (const model of ['GPT Image 20', 'GPT Image 2.7', 'GPT Image 2.6', 'prefix GPT Image 2', 'openai/gpt-image-2', 'openai/gpt-image-2/edit/extra', 'Nano Banana 2', null, 2]) {
    assert.equal(quoteImageCredits({ ...flare, model: model as unknown as string }), null);
  }
  for (const path of ['text', 'video', '', null, '__proto__']) {
    assert.equal(quoteImageCredits({ ...flare, path: path as unknown as typeof flare.path }), null);
  }
  for (const quality of [undefined, null, '', 'ultra', 'constructor', 2, ['medium']]) {
    assert.equal(quoteImageCredits({ ...flare, quality: quality as unknown as string }), null);
  }
  for (const [width, height] of [[undefined, undefined], [1024, undefined], [undefined, 1024], [0, 1024], [-1024, 1024], [1024.5, 1024], [4096, 4096], [2048, 1365], [1024, 864], [Infinity, 1024], [NaN, 1024], ['1024', 1024], [1024, null]]) {
    assert.equal(quoteImageCredits({ ...flare, width: width as number, height: height as number }), null);
  }
  for (const count of [0, -1, 0.5, 1.5, 5, Infinity, NaN, null, '2']) {
    assert.equal(quoteImageCredits({ ...flare, count: count as unknown as number }), null);
  }
});

test('edit requires reference input while priced, anonymous, insufficient and BYOK paths retain billing boundaries', () => {
  assert.equal(atlasModelSlug('GPT Image 2', 'reference'), 'openai/gpt-image-2/edit');
  for (const path of ['reference', 'edit'] as const) {
    const missing = decideGeneration({ ...flare, path, byok: false, ownerId: 'user-1', hasReference: false, now });
    assert.equal(missing.action, 'reject');
    if (missing.action === 'reject') assert.equal(missing.error, 'missing_reference');
  }
  const anonymous = decideGeneration({ ...flare, byok: false, ownerId: null, hasReference: true, now });
  assert.equal(anonymous.action, 'reject');
  if (anonymous.action === 'reject') {
    assert.equal(anonymous.error, 'no_identity');
    assert.equal(anonymous.credits, 2);
  }
  assert.equal(decideGeneration({ ...flare, byok: true, ownerId: null, hasReference: true, now }).action, 'byok');
  const poor = decideGeneration({ ...flare, count: 2, byok: false, ownerId: 'user-1', account: { ...emptyCreditAccount(), purchasedBalance: 3 }, hasReference: true, now });
  assert.equal(poor.action, 'reject');
  if (poor.action === 'reject') assert.equal(poor.error, 'insufficient');
  const unpriced = decideGeneration({ ...flare, width: 4096, height: 4096, byok: false, ownerId: 'user-1', hasReference: true, now });
  assert.equal(unpriced.action, 'reject');
  if (unpriced.action === 'reject') assert.equal(unpriced.error, 'unpriced');
});

test('the generation modal exposes a localized quote before the prompt or reference is ready', () => {
  for (const [locale, messages, label] of [['zh', zh, '生成 · 3 积分'], ['en', en, 'Generate · 3 credits']] as const) {
    const modal = createElement(GenerateModal, { open: true, onClose: () => {}, locale, item: { id: 'tariff' } as unknown as PromptGalleryItem });
    const session = createElement(SessionProvider, { session: null, children: modal });
    const markup = renderToStaticMarkup(createElement(NextIntlClientProvider, { locale, messages, timeZone: 'UTC', children: session }));
    assert.ok(markup.includes(label), `modal quote includes the ${locale} credit unit`);
  }
});

test('the generate button follows current parameters and only redirects when site credits are short', () => {
  assert.equal(generateButtonCredits(flare), 2);
  assert.equal(generateButtonCredits({ ...flare, count: 2 }), 4);
  assert.equal(generateButtonCredits({ ...flare, model: 'GPT Image 2', quality: 'medium' }), 6);
  assert.equal(generateButtonCredits({ ...flare, byok: true }), null);
  assert.equal(renderToStaticMarkup(createElement(GenerateCreditButton, { label: 'Generate', credits: 4, byok: false })), '<button type="button">Generate · 4</button>');
  assert.equal(renderToStaticMarkup(createElement(GenerateCreditButton, { label: 'Generate', credits: 4, byok: true })), '<button type="button">Generate</button>');
  assert.equal(shouldOpenPricing({ byok: false, credits: 4, balance: 3 }), true);
  assert.equal(shouldOpenPricing({ byok: false, credits: 4, balance: 4 }), false);
  assert.equal(shouldOpenPricing({ byok: true, credits: 4, balance: 0 }), false);
  assert.equal(generationBillingOffer('unpriced'), true);
  const offer = { title: 'Sign in first', body: 'Credits stay with this browser.', login: 'Sign in with Google', guest: 'Continue as guest', close: 'Close' };
  assert.equal(renderToStaticMarkup(createElement(GenerationBillingPrompt, { open: false, onClose: () => {}, onLogin: () => {}, onGuest: () => {}, copy: offer })), '');
  const dialog = renderToStaticMarkup(createElement(GenerationBillingPrompt, { open: true, onClose: () => {}, onLogin: () => {}, onGuest: () => {}, copy: offer }));
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /Sign in with Google/);
  assert.match(dialog, /Continue as guest/);
  assert.equal(dialog.includes('href="/login"'), false);
  assert.deepEqual(packImageCounts(245), { nanoBanana: 245, flareEdit: 122, gptImage2: 40 });
  assert.deepEqual(packImageCounts(495), { nanoBanana: 495, flareEdit: 247, gptImage2: 82 });
  assert.deepEqual(packImageCounts(995), { nanoBanana: 995, flareEdit: 497, gptImage2: 165 });
  assert.equal(approximateImageCount(245), 120);
  assert.equal(approximateImageCount(619), 310);
  assert.equal(approximateImageCount(1499), 750);
  assert.deepEqual(STARTER_CREDIT_MATRIX, [
    { model: 'GPT Image 2', text: 2, reference: 2, edit: 2 },
    { model: 'GPT Image 2.5 Sunburst', text: 2, reference: 2, edit: 2 },
    { model: 'GPT Image 2.5 Flare', text: 2, reference: 2, edit: 2 },
    { model: 'GPT Image 2.6 Sunburst', text: 3, reference: 3, edit: 3 },
    { model: 'GPT Image 2.6 Flare', text: 2, reference: 2, edit: 2 },
    { model: 'Nano Banana 2', text: 4, reference: 4, edit: 4 },
  ]);
});
