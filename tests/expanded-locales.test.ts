import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { parse } from '@formatjs/icu-messageformat-parser';
import { createTranslator } from 'next-intl';
import { modelDisplayLabel, PROVIDER_CAPABILITIES } from '../src/lib/generation/capabilities';
import { atlasModelSlug } from '../src/lib/billing/quotes';
import { locales, languages } from '../src/config';
import { buildLocaleHref, parseOpLocale } from '../src/lib/op-locale';
import { buildAlternates, normalizeLocale } from '../src/lib/seo/metadata';

const added = ['ko','fr','de','es','pt'];
test('all eight locales have native labels, localized links and region aliases', () => {
  assert.deepEqual([...locales], ['en','zh','ja',...added]);
  for (const locale of added) {
    assert.ok(languages.find(item => item.lang === locale));
    assert.equal(buildLocaleHref(locale, '/image-prompts'), `/${locale}/image-prompts`);
    assert.equal(normalizeLocale(locale), locale);
  }
  assert.equal(parseOpLocale('ko-KR'), 'ko');
  assert.equal(parseOpLocale('pt-BR'), 'pt');
  for (const locale of added) assert.ok(buildAlternates('en','/image-prompts').languages[locale]?.endsWith(`/${locale}/image-prompts`));
});
function flatten(value: unknown, prefix = '', out: Record<string,string> = {}) {
  if (typeof value === 'string') out[prefix] = value;
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key,item]) => flatten(item, `${prefix}.${key}`, out));
  return out;
}
const variables = (value: string) => Array.from(value.matchAll(/\{([a-zA-Z_][\w.-]*)(?:\s*[,}])/g)).map(match => match[1]).sort();
test('new languages contain the entire message tree with valid ICU and preserved placeholders', () => {
  const source = flatten(JSON.parse(readFileSync('messages/en.json','utf8')));
  for (const locale of added) {
    const translated = flatten(JSON.parse(readFileSync(`messages/${locale}.json`,'utf8')));
    assert.deepEqual(Object.keys(translated).sort(), Object.keys(source).sort(), `${locale}: message keys`);
    for (const [key,value] of Object.entries(source)) {
      assert.deepEqual(variables(translated[key]), variables(value), `${locale}:${key}: variables`);
      if (value.trim()) assert.ok(translated[key].trim(), `${locale}:${key}: non-empty`);
      try { parse(value); } catch { continue; }
      assert.doesNotThrow(() => parse(translated[key]), `${locale}:${key}: valid ICU`);
    }
  }
});

const modelDescriptions = {
  en: ['Detailed', 'Fast', 'Default'],
  zh: ['精细版', '快速版', '默认模型'],
  ja: ['高精細', '高速', 'デフォルト'],
  ko: ['고정밀', '고속', '기본 모델'],
  fr: ['Détaillé', 'Rapide', 'Modèle par défaut'],
  de: ['Detailreich', 'Schnell', 'Standardmodell'],
  es: ['Detallado', 'Rápido', 'Modelo predeterminado'],
  pt: ['Detalhado', 'Rápido', 'Modelo padrão'],
};
for (const [locale, [detailed, fast, defaultLabel]] of Object.entries(modelDescriptions)) {
  test(`${locale}: model descriptions are localized without changing brands or API identities`, () => {
    const messages = JSON.parse(readFileSync(`messages/${locale}.json`, 'utf8'));
    const t = createTranslator({ locale, messages, namespace: 'OpenPrompts' });
    for (const version of ['2.5', '2.6']) {
      assert.equal(modelDisplayLabel(`GPT Image ${version} Sunburst`, t), `GPT Image ${version} · ${detailed}`);
      assert.equal(modelDisplayLabel(`GPT Image ${version} Flare`, t), `GPT Image ${version} · ${fast}`);
      assert.equal(atlasModelSlug(`GPT Image ${version} Sunburst`, 'text-to-image'), `openai/gpt-image-${version}-sunburst/text-to-image`);
      assert.equal(atlasModelSlug(`GPT Image ${version} Flare`, 'edit'), `openai/gpt-image-${version}-flare/edit`);
    }
    assert.equal(modelDisplayLabel('Default', t), defaultLabel);
    for (const label of ['GPT Image 2', 'Nano Banana 2', 'Custom Flare', 'vendor/custom-model']) {
      assert.equal(modelDisplayLabel(label, t), label);
    }
    for (const provider of ['internal', 'atlascloud']) {
      assert.deepEqual(PROVIDER_CAPABILITIES[provider].models?.map(model => model.value), [
        'GPT Image 2.6 Sunburst', 'GPT Image 2.6 Flare',
        'GPT Image 2.5 Sunburst', 'GPT Image 2.5 Flare', 'GPT Image 2', 'Nano Banana 2',
      ]);
    }
    for (const key of ['modelDetailed', 'modelFast', 'modelDefault']) {
      assert.doesNotThrow(() => parse(messages.OpenPrompts.gen[key]));
    }
  });
}
