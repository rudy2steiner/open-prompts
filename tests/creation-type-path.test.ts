import test from 'node:test';
import assert from 'node:assert/strict';
import { creationTypeHref, creationTypePath, createWithModeHref } from '../src/lib/generation/creation-types';
import { buildPageMetadata } from '../src/lib/seo/metadata';

const slugs = ['text-to-image', 'reference-to-image', 'image-edit'] as const;
const locales = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt'] as const;

for (const slug of slugs) {
  test(`${slug} links directly to its root landing page in every locale`, () => {
    assert.equal(creationTypePath(slug), `/${slug}`);
    for (const locale of locales) {
      assert.equal(creationTypeHref(locale, slug), `${locale === 'en' ? '' : `/${locale}`}/${slug}`);
    }
  });

  test(`${slug} canonical, language alternates and Open Graph use the root route`, () => {
    for (const locale of locales) {
      const metadata = buildPageMetadata({ locale, path: creationTypePath(slug), title: 'Creation', description: 'Create images' });
      const pathname = `${locale === 'en' ? '' : `/${locale}`}/${slug}`;
      assert.equal(new URL(String(metadata.alternates?.canonical)).pathname, pathname);
      assert.equal(new URL(String(metadata.openGraph?.url)).pathname, pathname);
      const languages = metadata.alternates?.languages as Record<string, string>;
      assert.equal(Object.keys(languages).length, 9);
      for (const language of locales) {
        assert.equal(new URL(languages[language]).pathname, `${language === 'en' ? '' : `/${language}`}/${slug}`);
      }
      assert.equal(new URL(languages['x-default']).pathname, `/${slug}`);
    }
  });
}

test('old creation landing URLs permanently redirect without redirecting the workspace', async () => {
  const config = (await import('../next.config.mjs')).default;
  const redirects = await config.redirects!();
  for (const slug of slugs) {
    const unprefixed = redirects.find(route => route.source === `/create/${slug}`);
    assert.ok(unprefixed, `missing permanent redirect for /create/${slug}`);
    assert.equal(unprefixed.destination, `/${slug}`);
    assert.equal(unprefixed.permanent, true);
    for (const locale of locales) {
      const route = redirects.find(route => route.source === `/${locale}/create/${slug}`);
      assert.ok(route, `missing permanent redirect for ${locale}/${slug}`);
      assert.equal(route.destination, `${locale === 'en' ? '' : `/${locale}`}/${slug}`);
      assert.equal(route.permanent, true);
    }
  }
  assert.equal(redirects.some(route => route.source === '/create' || route.source === '/zh/create'), false);
});

test('site demo CTA carries explicit context without changing ordinary template links', () => {
  assert.equal(createWithModeHref('zh', 'reference', 'gpt-image-2-on-chatgpt-f7a4c7af', 'site'), '/zh/create?mode=reference&template=gpt-image-2-on-chatgpt-f7a4c7af&demo=site');
});

test('generation CTAs still open the workspace with their mode and template', () => {
  assert.equal(createWithModeHref('en', 'text'), '/create?mode=text');
  assert.equal(createWithModeHref('zh', 'reference', 'travel-field-notes-458ca2b0'), '/zh/create?mode=reference&template=travel-field-notes-458ca2b0');
  assert.equal(createWithModeHref('ja', 'edit'), '/ja/create?mode=edit');
});
