import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { parse } from '@formatjs/icu-messageformat-parser';
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
