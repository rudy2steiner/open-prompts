import React from 'react';
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextIntlClientProvider } from 'next-intl';
import { SessionProvider } from 'next-auth/react';
import { GenerateModal } from '../src/components/generation/GenerateModal';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { createRequire } from 'node:module';

test('create page only offers independent resolution for AtlasCloud', async () => {
  const require = createRequire(import.meta.url);
  const previousCss = require.extensions['.css'];
  require.extensions['.css'] = () => {};
  const { default: PageComponent } = await import('../src/app/[locale]/create/PageComponent').finally(() => {
    if (previousCss) require.extensions['.css'] = previousCss;
    else delete require.extensions['.css'];
  });
  const messages = JSON.parse(readFileSync('messages/en.json', 'utf8'));
  const router = { bfcacheId: 'test-router', back() {}, forward() {}, refresh() {}, push() {}, replace() {}, prefetch() {} };
  for (const provider of ['atlascloud', 'replicate']) {
    const html = renderToStaticMarkup(
      <AppRouterContext.Provider value={router}>
        <NextIntlClientProvider locale="en" messages={messages} timeZone="UTC">
          <SessionProvider session={null}>
            <PageComponent locale="en" prompts={[]} provider={provider} />
          </SessionProvider>
        </NextIntlClientProvider>
      </AppRouterContext.Provider>
    );
    assert.equal(html.includes('2K ·'), provider === 'atlascloud');
    assert.equal(html.includes(messages.OpenPrompts.gen.resolutionExperimental), provider === 'atlascloud');
  }
});

for (const [locale, detailed, fast] of [
  ['en', 'Detailed', 'Fast'], ['zh', '精细版', '快速版'], ['ja', '高精細', '高速'], ['ko', '고정밀', '고속'],
  ['fr', 'Détaillé', 'Rapide'], ['de', 'Detailreich', 'Schnell'], ['es', 'Detallado', 'Rápido'], ['pt', 'Detalhado', 'Rápido'],
]) {
  test(`${locale}: generation modal renders localized labels with unchanged option values`, () => {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'));
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="UTC">
        <SessionProvider session={null}>
          <GenerateModal open onClose={() => {}} locale={locale} item={{ id: 'model-label', title: 'Model', description: '', prompt: '', images: [], tags: [], model: 'GPT Image 2' }} />
        </SessionProvider>
      </NextIntlClientProvider>
    );
    assert.ok(html.includes(`<div class="col-span-2"><div class="mb-1 text-[11px] font-semibold text-stone-600">${messages.OpenPrompts.gen.model}</div>`), 'model occupies its own full-width row');
    assert.ok(html.includes(messages.OpenPrompts.gen.resolution));
    assert.ok(html.includes(messages.OpenPrompts.gen.resolutionExperimental));
    assert.match(html, new RegExp(`value="GPT Image 2.6 Sunburst"[^>]*>GPT Image 2.6 · ${detailed}</option>`));
    assert.match(html, new RegExp(`value="GPT Image 2.5 Flare"[^>]*>GPT Image 2.5 · ${fast}</option>`));
    assert.match(html, /value="Nano Banana 2"[^>]*>Nano Banana 2<\/option>/);
    assert.match(html, /value="GPT Image 2\.6 Sunburst" selected=""/);
    for (const [value, key] of [['1k', 'qualityLow'], ['2k', 'qualityMedium'], ['4k', 'qualityHigh']]) {
      assert.match(html, new RegExp(`<option value="${value}"[^>]*>${messages.OpenPrompts.gen[key]}</option>`));
    }
    assert.doesNotMatch(html, />[124]k</);
    assert.deepEqual(Array.from(html.matchAll(/<option value="(GPT Image [^"]+|Nano Banana 2)"[^>]*>/g), match => match[1]), [
      'GPT Image 2.6 Sunburst', 'GPT Image 2.6 Flare',
      'GPT Image 2.5 Sunburst', 'GPT Image 2.5 Flare', 'GPT Image 2', 'Nano Banana 2',
    ]);
  });
}
