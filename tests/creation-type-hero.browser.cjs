const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseUrl = process.env.HERO_TEST_BASE_URL || 'http://localhost:3000';
const path = require('node:path');
const projectRoot = path.resolve(__dirname, '..');
const caseCounts = { 'text-to-image': 6, 'reference-to-image': 5, 'image-edit': 1 };
const zhMedia = require('../messages/zh.json').OpenPrompts.creationTypes.common.media;
const embeddedExamples = {
  watercolor: {
    outputs: ['https://pbs.twimg.com/media/HRwBR6UaQAA40-1.jpg?name=orig', 'https://pbs.twimg.com/media/HRwBR6ZaIAAhEdX.jpg?name=orig'],
    source: 'https://x.com/Sairah_0/status/2097552949862097218',
  },
  redraw: {
    outputs: ['https://pbs.twimg.com/media/HSy0Tz-bAAAlh5x.jpg?name=orig', 'https://pbs.twimg.com/media/HSy0Ur0asAEEBGW.jpg?name=orig'],
    source: 'https://x.com/ahmadmalik375/status/2102253407126081699',
  },
  restoration: {
    outputs: ['https://pbs.twimg.com/media/HS2NTU8WAAAmclT.jpg?name=orig', 'https://pbs.twimg.com/media/HS2NTU4XoAA0BUJ.jpg?name=orig'],
    source: 'https://x.com/visualaiclub/status/2102491975173763172',
  },
};

async function assertEmbedded(section, example, labels = zhMedia) {
  assert.equal(await section.locator('[data-group="inputs"]').count(), 0, 'cropped references embedded in real outputs are hidden only in the UI');
  assert.deepEqual(await section.locator('[data-group="outputs"] img').evaluateAll(images => images.map(img => img.getAttribute('src'))), example.outputs, 'complete original outputs are preserved in order');
  assert.equal(await section.getByText(labels.embeddedReference, { exact: false }).count(), 0, 'embedded-reference captions are omitted');
  assert.equal(await section.locator('.op-artwork-origin').count(), 0, 'source captions are omitted');
  assert.equal(await section.getByText(labels.partialReferences, { exact: true }).count(), 0, 'embedded-only references are not reported as incomplete');
  assert.equal(await section.getByText(labels.missingReference, { exact: true }).count(), 0);
}

// Synthetic role assignments are test data, not catalog templates. Bundle the actual
// production component in memory and reuse CSS already loaded by the real page.
let fixtureBundle;
async function mountMediaFixture(page, media, options = {}) {
  fixtureBundle ??= require('esbuild').build({
    absWorkingDir: projectRoot,
    stdin: {
      contents: `import React from 'react';
import { createRoot } from 'react-dom/client';
import { CreationShowcaseMedia } from '~/components/create/CreationShowcaseMedia';
window.mountCreationMediaFixture = props => {
  const host = document.createElement('section');
  host.id = 'creation-media-fixture';
  host.className = 'op-ctype-case-media';
  host.setAttribute('aria-label', 'Synthetic media contract fixture — not a catalog template');
  host.style.cssText = 'width:calc(100% - 32px);max-width:1000px;margin:32px auto';
  document.querySelector('.op-landing-root').appendChild(host);
  createRoot(host).render(React.createElement(CreationShowcaseMedia, props));
};`,
      resolveDir: projectRoot,
      sourcefile: 'creation-media-fixture.tsx',
      loader: 'tsx',
    },
    bundle: true,
    write: false,
    platform: 'browser',
    format: 'iife',
    jsx: 'automatic',
    loader: { '.css': 'empty' },
    // Next normally substitutes these at build time; standalone bundles use its defaults.
    define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' },
    logLevel: 'silent',
  }).then(result => result.outputFiles[0].text);
  await page.goto(`${baseUrl}/zh/reference-to-image`, { waitUntil: 'domcontentloaded' });
  // Exercise a real React handler before adding a separate root after the hydrated page.
  await page.locator('.op-ctype-demo [data-group="outputs"] .op-artwork-slide button').first().click();
  await page.getByRole('dialog').waitFor();
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.evaluate(source => (0, eval)(source), await fixtureBundle);
  await page.evaluate(props => window.mountCreationMediaFixture(props), {
    media, title: 'Synthetic media contract fixture — not a catalog template',
    imageKeyPrefix: 'test-only-media-contract', needsInput: true, priority: true,
    labels: { ...zhMedia, coverLoadFailed: require('../messages/zh.json').OpenPrompts.gallery.coverLoadFailed },
    ...options,
  });
  const host = page.locator('#creation-media-fixture');
  await host.locator('.op-creation-media').waitFor();
  await host.scrollIntoViewIfNeeded();
  return host;
}

async function assertRailSelection(group, index, expectedUrl, count) {
  await group.locator('.op-artwork-strip').evaluate((strip, expected) => new Promise((resolve, reject) => {
    const start = performance.now();
    const check = () => {
      const selected = Math.round(strip.scrollLeft / strip.clientWidth);
      const src = strip.children[selected]?.querySelector('img')?.getAttribute('src');
      const counter = strip.closest('.op-artwork').querySelector('.op-artwork-count').textContent;
      if (selected === expected.index && src === expected.url && counter === `${expected.index + 1} / ${expected.count}`) resolve();
      else if (performance.now() - start > 5000) reject(new Error(`Expected slide ${expected.index} URL ${expected.url}; got ${selected} ${src} (${counter})`));
      else requestAnimationFrame(check);
    };
    check();
  }), { index, url: expectedUrl, count });
}

async function selectRail(group, index) {
  await group.scrollIntoViewIfNeeded();
  await group.locator('.op-artwork-strip').evaluate((strip, next) => strip.scrollTo({ left: strip.clientWidth * next }), index);
}

async function withPage(width, run) {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width, height: 900 } });
  const errors = [];
  const forbiddenRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (request.method() !== 'GET' && /\/api\/(generations|upload)/.test(request.url())) forbiddenRequests.push(request.url());
  });
  await page.route('**/api/generations**', route => route.abort());
  try {
    await run(page);
    assert.deepEqual(errors, [], 'no uncaught browser errors');
    assert.deepEqual(forbiddenRequests, [], 'showcases do not generate or upload images');
  } finally {
    await browser.close();
  }
}

async function scrollRail(page, group, direction) {
  const strip = group.locator('.op-artwork-strip');
  await strip.hover();
  await page.mouse.wheel(direction * (await strip.boundingBox()).width, 0);
}

async function assertNaturalImage(image) {
  await image.scrollIntoViewIfNeeded();
  await image.evaluate(async img => {
    await img.decode();
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
  const size = await image.evaluate(img => {
    const r = img.getBoundingClientRect();
    return { width: r.width, height: r.height, ratio: (r.width / r.height) / (img.naturalWidth / img.naturalHeight), railHeight: img.closest('.op-artwork-strip, .op-artwork-grid')?.clientHeight };
  });
  assert.ok(Math.abs(size.ratio - 1) < 0.005, 'the entire artwork retains its original proportions');
  assert.ok(size.railHeight >= size.height - 1, 'the decoded image is not clipped by a stale loading rail height');
  return size;
}

test('homepage CTA limits no-account promises to browsing and copying in every locale', async () => {
  await withPage(390, async page => {
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    for (const locale of ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt']) {
      await page.goto(`${baseUrl}${locale === 'en' ? '/' : `/${locale}`}`, { waitUntil: 'domcontentloaded' });
      const copy = require(`../messages/${locale}.json`).OpenPrompts.homePage.seoContent.cta;
      const section = page.locator('.op-landing-cta[aria-labelledby="home-seo-cta"]');
      assert.equal(await section.locator('.op-landing-cta-sub').textContent(), copy.subtitle);
      const note = await section.locator('.op-landing-cta-note').textContent();
      assert.ok(note.startsWith(copy.note.split('{count}')[0]));
      assert.ok(!note.includes('{count}'));
      assert.equal(await section.locator('a').first().getAttribute('href'), `${locale === 'en' ? '' : `/${locale}`}/image-prompts`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
      if (locale === 'en' || locale === 'zh') {
        assert.ok(note.startsWith(locale === 'en' ? 'Browse without an account ·' : '浏览无需账户 ·'));
        await section.scrollIntoViewIfNeeded();
        await section.screenshot({ path: `/tmp/home-browsing-without-account-${locale}.png` });
      }
    }
  });
});

for (const width of [320, 390, 1440]) {
  test(`${width}px: each creation Hero links all three modes and highlights only its current mode`, async () => {
    await withPage(width, async page => {
      const slugs = ['text-to-image', 'reference-to-image', 'image-edit'];
      const keys = ['textToImage', 'referenceToImage', 'imageEdit'];
      const copy = require('../messages/zh.json').OpenPrompts.creationTypes;
      await page.goto(`${baseUrl}/zh/text-to-image`, { waitUntil: 'domcontentloaded' });
      for (const [index, slug] of slugs.entries()) {
        const hero = page.locator('.op-ctype-hero');
        assert.equal(await page.locator('.op-artwork-origin').count(), 0);
        assert.doesNotMatch(await page.locator('.op-ctype-demo, .op-ctype-showcase').allTextContents().then(text => text.join('\n')), /成片中已包含原图|查看来源|本站实测|参考图来自作品库|查看参考作品|GPT Image 2 ·/);
        const nav = hero.locator('.op-landing-creation-nav');
        assert.equal(await nav.locator('a').count(), 3);
        assert.equal(await nav.getAttribute('aria-label'), copy.section.title);
        assert.deepEqual(await nav.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href'))), slugs.map(value => `/zh/${value}`));
        assert.deepEqual(await nav.locator('a').allTextContents(), keys.map(key => copy.types[key].name));
        assert.equal(await nav.locator('a[aria-current="page"]').count(), 1);
        assert.equal(await nav.locator('a[aria-current="page"]').getAttribute('href'), `/zh/${slug}`);
        const current = await nav.locator('a[aria-current="page"]').evaluate(link => getComputedStyle(link).backgroundColor);
        const next = nav.locator('a').nth((index + 1) % slugs.length);
        assert.notEqual(current, await next.evaluate(link => getComputedStyle(link).backgroundColor), 'current mode is visibly highlighted');
        const sizes = await nav.locator('a').evaluateAll(links => links.map(link => {
          const bounds = link.getBoundingClientRect();
          const parent = link.parentElement.getBoundingClientRect();
          return { height: bounds.height, inside: bounds.left >= parent.left - 1 && bounds.right <= parent.right + 1 };
        }));
        assert.ok(sizes.every(size => size.height >= 44 && size.inside), 'mode links wrap within the Hero and retain touch targets');
        assert.equal(await hero.locator('.op-landing-actions a').count(), 2);
        assert.equal(await hero.locator('.op-ctype-demo details[open]').count(), 0);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        for (const image of await hero.locator('.op-ctype-demo img').all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(img => img.decode());
        }
        await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
        await page.screenshot({ path: `/tmp/creation-hero-mode-links-${slug}-${width}.png` });
        await Promise.all([
          page.waitForURL(`${baseUrl}/zh/${slugs[(index + 1) % slugs.length]}`),
          index === 0 ? next.focus().then(() => page.keyboard.press('Enter')) : next.click(),
        ]);
      }
      assert.equal(await page.locator('.op-ctype-hero .op-landing-creation-nav a[aria-current="page"]').getAttribute('href'), '/zh/text-to-image');
    });
  });
}

test('eight locales keep creation Hero mode links localized with exactly one current mode', async () => {
  await withPage(320, async page => {
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    const slugs = ['text-to-image', 'reference-to-image', 'image-edit'];
    const keys = ['textToImage', 'referenceToImage', 'imageEdit'];
    for (const locale of ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt']) {
      const prefix = locale === 'en' ? '' : `/${locale}`;
      const copy = require(`../messages/${locale}.json`).OpenPrompts.creationTypes;
      for (const slug of slugs) {
        await page.goto(`${baseUrl}${prefix}/${slug}`, { waitUntil: 'domcontentloaded' });
        const nav = page.locator('.op-ctype-hero .op-landing-creation-nav');
        assert.deepEqual(await nav.locator('a').allTextContents(), keys.map(key => copy.types[key].name));
        assert.deepEqual(await nav.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href'))), slugs.map(value => `${prefix}/${value}`));
        assert.equal(await nav.locator('a[aria-current="page"]').count(), 1);
        assert.equal(await nav.locator('a[aria-current="page"]').getAttribute('href'), `${prefix}/${slug}`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 320);
      }
    }
  });
});

test('creation root routes publish localized canonical, alternates and root breadcrumbs', async () => {
  await withPage(900, async page => {
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
    const locales = ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt'];
    for (const locale of locales) {
      for (const slug of ['text-to-image', 'reference-to-image', 'image-edit']) {
        const pathname = `${locale === 'en' ? '' : `/${locale}`}/${slug}`;
        const response = await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200, `${pathname} is a real landing page`);
        assert.equal(new URL(page.url()).pathname, pathname);
        assert.equal(await page.locator('.op-ctype-demo').count(), 1);
        const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
        assert.equal(new URL(canonical).pathname, pathname);
        assert.equal(await page.locator('meta[property="og:url"]').getAttribute('content'), canonical);
        const alternates = await page.locator('link[rel="alternate"][hreflang]').evaluateAll(links => Object.fromEntries(links.map(link => [link.hreflang, link.href])));
        assert.equal(Object.keys(alternates).length, 9);
        for (const language of locales) {
          assert.equal(new URL(alternates[language]).pathname, `${language === 'en' ? '' : `/${language}`}/${slug}`);
        }
        assert.equal(new URL(alternates['x-default']).pathname, `/${slug}`);
        const graph = await page.locator('script[type="application/ld+json"]').evaluateAll(scripts => scripts.flatMap(script => JSON.parse(script.textContent)['@graph'] ?? []));
        assert.equal(graph.find(item => item['@type'] === 'WebPage').url, canonical);
        assert.equal(graph.find(item => item['@type'] === 'SoftwareApplication').url, canonical);
        const breadcrumb = graph.find(item => item['@type'] === 'BreadcrumbList').itemListElement;
        assert.equal(breadcrumb.length, 2);
        assert.equal(new URL(breadcrumb[0].item).pathname, locale === 'en' ? '/' : `/${locale}`);
        assert.equal(breadcrumb[1].item, canonical);
        assert.equal(breadcrumb[1].position, 2);
        assert.equal(await page.locator('.op-ctype-breadcrumb a').count(), 1);
        const cta = new URL(await page.locator('.op-ctype-hero .op-landing-btn-primary').getAttribute('href'), baseUrl);
        assert.equal(cta.pathname, `${locale === 'en' ? '' : `/${locale}`}/create`);
        assert.equal(cta.searchParams.get('mode'), slug === 'text-to-image' ? 'text' : slug === 'reference-to-image' ? 'reference' : 'edit');
        if (locale === 'zh') {
          const messages = require('../messages/zh.json').OpenPrompts;
          await page.getByTitle(messages.header.language, { exact: true }).click();
          const headerLinks = await page.locator('header a').evaluateAll(links => links.map(link => link.getAttribute('href')));
          for (const language of locales) assert.ok(headerLinks.includes(`${language === 'en' ? '' : `/${language}`}/${slug}`));
          await page.getByTitle(messages.header.language, { exact: true }).click();
        }
      }
    }
  });
});

test('legacy creation URLs return permanent redirects with query values intact and leave the workspace alone', async () => {
  await withPage(900, async page => {
    for (const locale of ['', 'en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt']) {
      for (const slug of ['text-to-image', 'reference-to-image', 'image-edit']) {
        const prefix = locale ? `/${locale}` : '';
        const response = await page.request.get(`${baseUrl}${prefix}/create/${slug}?utm_source=legacy&template=travel-field-notes-458ca2b0&tag=first&tag=second`, { maxRedirects: 0 });
        assert.equal(response.status(), 308, `${prefix}/create/${slug} permanently redirects before rendering`);
        const target = new URL(response.headers().location, baseUrl);
        assert.equal(target.pathname, `${locale === '' || locale === 'en' ? '' : prefix}/${slug}`);
        assert.equal(target.searchParams.get('utm_source'), 'legacy');
        assert.equal(target.searchParams.get('template'), 'travel-field-notes-458ca2b0');
        assert.deepEqual(target.searchParams.getAll('tag'), ['first', 'second']);
      }
    }
    const workspace = await page.request.get(`${baseUrl}/zh/create?mode=reference`, { maxRedirects: 0 });
    assert.equal(workspace.status(), 200);
    assert.equal(workspace.headers().location, undefined);
    assert.equal((await page.request.get(`${baseUrl}/zh/not-a-creation-type`)).status(), 404);
    assert.equal((await page.request.get(`${baseUrl}/zh/create/not-a-creation-type`)).status(), 404);
  });
});

test('sitemap lists root creation URLs and keeps the generation workspace', async () => {
  await withPage(900, async page => {
    const response = await page.request.get(`${baseUrl}/sitemap.xml`);
    assert.equal(response.status(), 200);
    const xml = await response.text();
    const paths = new Set(Array.from(xml.matchAll(/<loc>([^<]+)<\/loc>/g), match => new URL(match[1]).pathname));
    for (const locale of ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt']) {
      const prefix = locale === 'en' ? '' : `/${locale}`;
      assert.ok(paths.has(`${prefix}/create`));
      for (const slug of ['text-to-image', 'reference-to-image', 'image-edit']) {
        assert.ok(paths.has(`${prefix}/${slug}`));
        assert.equal(paths.has(`${prefix}/create/${slug}`), false);
      }
    }
  });
});

for (const width of [320, 390, 900, 1200, 1440]) {
  test(`${width}px: home creation cards reuse their corresponding Hero artwork`, async () => {
    await withPage(width, async page => {
      await page.goto(`${baseUrl}/zh`, { waitUntil: 'domcontentloaded' });
      const hero = page.locator('.op-landing-hero');
      const heroLinks = hero.locator('.op-landing-creation-nav a');
      assert.equal(await heroLinks.count(), 3, 'home Hero directly links to all three creation landing pages');
      assert.deepEqual(await heroLinks.allTextContents(), ['文生图', '参考生图', '图片编辑']);
      assert.equal(await hero.locator('.op-landing-actions a').count(), 3, 'existing primary actions are preserved');
      const heroBounds = await hero.boundingBox();
      for (const link of await heroLinks.all()) {
        assert.equal(await link.isVisible(), true);
        const bounds = await link.boundingBox();
        assert.ok(bounds.width > 44 && bounds.height >= 44, 'creation entries remain easy to tap');
        assert.ok(bounds.x >= heroBounds.x && bounds.x + bounds.width <= heroBounds.x + heroBounds.width + 1, 'creation entries wrap inside the Hero on narrow screens');
      }
      const section = page.locator('section[aria-labelledby="creation-types"]');
      const cards = section.locator('.op-ctype-card');
      assert.equal(await cards.count(), 3);
      assert.equal(await section.locator('.op-ctype-flow').count(), 0, 'real artwork replaces the symbolic input/output diagrams');
      const examples = [
        ['text-to-image', 'https://pbs.twimg.com/media/HU23TzbbAAAgCLd.jpg?name=orig'],
        ['reference-to-image', 'https://pbs.twimg.com/media/HRwBR6UaQAA40-1.jpg?name=orig'],
        ['image-edit', 'https://pbs.twimg.com/media/HS2NTU8WAAAmclT.jpg?name=orig'],
      ];
      const heights = [];
      for (const [i, [slug, src]] of examples.entries()) {
        const card = cards.nth(i);
        const image = card.locator('.op-ctype-preview img');
        assert.equal(await image.count(), 1, 'each way has one complete result, not a decorative input icon');
        assert.equal(await image.getAttribute('src'), src);
        assert.equal(await image.getAttribute('loading'), 'lazy');
        assert.ok(await image.getAttribute('alt'));
        assert.equal(await card.locator('.op-ctype-preview').getAttribute('href'), `/zh/${slug}`);
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(img => img.decode());
        const size = await image.evaluate(img => {
          const r = img.getBoundingClientRect();
          const preview = img.closest('.op-ctype-preview').getBoundingClientRect();
          const card = img.closest('.op-ctype-card').getBoundingClientRect();
          return { height: r.height, ratio: (r.width / r.height) / (img.naturalWidth / img.naturalHeight), gutters: Math.abs(r.left - preview.left) + Math.abs(r.right - preview.right) + Math.abs(r.top - preview.top) + Math.abs(r.bottom - preview.bottom), edgeInset: Math.max(r.left - card.left, card.right - r.right, r.top - card.top) };
        });
        heights.push(size.height);
        assert.ok(size.gutters < 1 && size.edgeInset < 2, 'artwork fills the card edges without a fixed-height empty frame');
        assert.ok(Math.abs(size.ratio - 1) < 0.005, 'the whole Hero image retains its natural proportions');
        assert.ok(size.height > 150);
      }
      assert.ok(Math.max(...heights) - Math.min(...heights) < 1, 'all three image previews have equal heights');
      assert.equal(await section.locator('details, [data-group="inputs"], [data-group="unclassified"]').count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await section.screenshot({ path: `/tmp/home-creation-hero-previews-${width}.png` });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `/tmp/home-hero-creation-entries-${width}.png` });
      for (const [i, [slug, src]] of examples.entries()) {
        const link = heroLinks.nth(i);
        assert.equal(await link.getAttribute('href'), `/zh/${slug}`);
        if (i === 0) await link.press('Enter');
        else await link.click();
        assert.equal(new URL(page.url()).pathname, `/zh/${slug}`);
        assert.equal(await page.locator('.op-ctype-demo [data-group="outputs"] img').first().getAttribute('src'), src);
        await page.goBack({ waitUntil: 'domcontentloaded' });
      }
      for (const [i, [, src]] of examples.entries()) {
        await cards.nth(i).scrollIntoViewIfNeeded();
        await cards.nth(i).locator('.op-ctype-preview img').evaluate(img => img.decode());
        await cards.nth(i).locator('.op-ctype-preview').click();
        assert.equal(await page.locator('.op-ctype-demo [data-group="outputs"] img').first().getAttribute('src'), src);
        assert.equal(await page.locator('section[aria-labelledby^="creation-types-"] .op-ctype-preview').count(), 0, 'other-ways navigation remains unchanged outside the home page');
        await page.goBack({ waitUntil: 'domcontentloaded' });
      }
    });
  });
}

for (const width of [320, 390, 900, 1200, 1440]) {
  for (const slug of ['text-to-image', 'reference-to-image', 'image-edit']) {
    test(`${width}px: ${slug} gives hero and every case large, proportionate artwork`, async () => {
      await withPage(width, async page => {
        const response = await page.goto(`${baseUrl}/zh/${slug}`, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200);
        const hero = page.locator('.op-ctype-demo');
        assert.equal(await hero.locator('.op-browser-chrome, .op-browser-url, .op-browser-mockup').count(), 0);
        assert.ok(await hero.locator('[data-group="outputs"] img').count() > 0, 'hero uses the shared, explicitly labeled artwork output group');
        assert.equal(await page.locator('.op-artwork-controls button').count(), 0, 'multi-image groups scroll without manual switching buttons');
        const output = hero.locator('[data-group="outputs"] img').first();
        const size = await assertNaturalImage(output);
        assert.ok((await hero.boundingBox()).width <= width, 'hero fits the viewport without requiring unused artwork space');
        assert.ok(size.height <= (width < 768 ? 352 : 512), 'artwork height is bounded so the page stays usable');
        assert.ok(size.width >= Math.min(width * 0.42, 180), 'hero artwork remains readable without taking over the page');
        if (slug === 'text-to-image') {
          assert.equal(await hero.locator('[data-group="inputs"]').count(), 0, 'text generation has no invented image input');
        } else {
          await assertEmbedded(hero, embeddedExamples[slug === 'reference-to-image' ? 'watercolor' : 'restoration']);
          await assertNaturalImage(hero.locator('[data-group="outputs"] img').nth(1));
        }
        const prompt = hero.locator('.op-ctype-demo-prompt');
        assert.equal(await prompt.isVisible(), false, 'hero prompt defaults closed');
        await hero.locator('summary').click();
        assert.equal(await prompt.isVisible(), true);
        await hero.locator('summary').press('Enter');
        assert.equal(await prompt.isVisible(), false);
        const cases = page.locator('.op-ctype-case');
        assert.equal(await cases.count(), caseCounts[slug]);
        for (let i = 0; i < caseCounts[slug]; i++) {
          const article = cases.nth(i);
          assert.equal(await article.locator('details[open] p').isVisible(), true, 'non-hero prompts default open');
          const media = article.locator('.op-ctype-case-media');
          assert.ok((await media.boundingBox()).width <= width, 'case media fits the viewport');
          if (await media.locator('.is-results-only').count()) {
            assert.ok(Math.abs((await media.boundingBox()).width - (await media.locator('.is-results-only').boundingBox()).width) < 2, 'standalone results do not reserve an oversized empty column');
          } else {
            assert.ok((await media.boundingBox()).width >= width * (width >= 1200 ? 0.60 : 0.85), 'independent inputs and outputs retain a wide comparison area');
          }
          await article.scrollIntoViewIfNeeded();
          const artworkImages = await media.locator('.op-artwork img').all();
          for (const image of artworkImages) {
            await image.scrollIntoViewIfNeeded();
            await image.evaluate(img => img.decode());
          }
          for (const image of artworkImages) {
            const caseSize = await assertNaturalImage(image);
            assert.ok(caseSize.height <= (width < 768 ? 352 : 512), 'case artworks do not create oversized sections');
            const widthScale = await image.evaluate(img => {
              if (!img.closest('.is-equal-height')) return 1;
              const ratios = Array.from(img.closest('.op-artwork-grid').querySelectorAll('img'), image => image.naturalWidth / image.naturalHeight);
              return (img.naturalWidth / img.naturalHeight) / Math.max(...ratios);
            });
            assert.ok(caseSize.width >= Math.min(width * 0.40, 140) * widthScale, 'equal-height artwork stays readable with widths proportional to its original ratio');
          }
          if (await media.locator('.is-equal-height').count()) {
            const heights = await media.locator('.op-artwork-grid img').evaluateAll(images => images.map(img => img.getBoundingClientRect().height));
            assert.ok(Math.max(...heights) - Math.min(...heights) < 1, 'multi-result artwork has equal heights rather than forced equal widths');
          }
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'no horizontal overflow');
        await hero.scrollIntoViewIfNeeded();
        await hero.screenshot({ path: `/tmp/creation-artwork-hero-${slug}-${width}.png` });
        const screenshotCase = cases.nth(Math.min(3, caseCounts[slug] - 1));
        for (const image of await screenshotCase.locator('.op-artwork img').all()) await assertNaturalImage(image);
        await screenshotCase.screenshot({ path: `/tmp/creation-artwork-case-${slug}-${width}.png` });
      });
    });
  }
}

for (const width of [390, 1440]) {
  test(`${width}px: complete output tiles zoom any result with keyboard navigation`, async () => {
    await withPage(width, async page => {
      await page.goto(`${baseUrl}/zh/reference-to-image`, { waitUntil: 'domcontentloaded' });
      const hero = page.locator('.op-ctype-demo');
      const outputs = hero.locator('[data-group="outputs"]');
      const example = embeddedExamples.watercolor;
      await assertEmbedded(hero, example);
      await assertNaturalImage(outputs.locator('img').first());
      assert.equal(await outputs.locator('.op-artwork-grid button[tabindex="0"]').count(), 2);
      await assertNaturalImage(outputs.locator('img').nth(1));
      const zoom = outputs.locator('.op-artwork-slide button').nth(1);
      await zoom.click();
      const viewer = page.getByRole('dialog');
      await viewer.waitFor();
      const assertViewer = async index => {
        await page.waitForFunction(expected => {
          const el = document.querySelector('[role="dialog"] .op-viewer-strip');
          return el && Math.round(el.scrollLeft / el.clientWidth) === expected && document.querySelector('.op-viewer-counter')?.textContent === `${expected + 1} / 2`;
        }, index);
        assert.deepEqual(await viewer.locator('.op-viewer-slide img').evaluateAll(images => images.map(img => img.getAttribute('src'))), example.outputs, 'zoom contains only complete outputs, never the extracted crops');
        assert.equal(await viewer.locator('.op-viewer-strip').evaluate(el => el.children[Math.round(el.scrollLeft / el.clientWidth)].querySelector('img').getAttribute('src')), example.outputs[index]);
      };
      await assertViewer(1);
      await page.keyboard.press('ArrowLeft');
      await assertViewer(0);
      await page.keyboard.press('ArrowRight');
      await assertViewer(1);
      await page.keyboard.press('Escape');
      await viewer.waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.matches('.op-ctype-demo [data-group="outputs"] .op-artwork-slide button'));
      assert.equal(await zoom.evaluate(el => el === document.activeElement), true, 'closing restores focus to the selected output trigger');
      assert.equal(await outputs.locator('.op-artwork-count').textContent(), '2');
      assert.equal(await outputs.locator('.op-artwork-grid').evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
    });
  });
}

for (const width of [390, 1440]) {
  test(`${width}px: zoom close button stays above the sticky header`, async () => {
    await withPage(width, async page => {
      await page.goto(`${baseUrl}/zh/reference-to-image`, { waitUntil: 'domcontentloaded' });
      const trigger = page.locator('.op-ctype-demo [data-group="outputs"] .op-artwork-slide button').first();
      await trigger.click();
      const close = page.getByRole('dialog').locator('.op-viewer-close');
      await close.waitFor();
      assert.equal(await close.evaluate(button => {
        const r = button.getBoundingClientRect();
        return button.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      }), true, 'the modal close button is not covered by the site header');
      await close.click();
      await page.getByRole('dialog').waitFor({ state: 'detached' });
    });
  });
  test(`${width}px: Escape restores focus after clicking an artwork image`, async () => {
    await withPage(width, async page => {
      await page.goto(`${baseUrl}/zh/reference-to-image`, { waitUntil: 'domcontentloaded' });
      const trigger = page.locator('.op-ctype-demo [data-group="outputs"] .op-artwork-slide button').first();
      await trigger.locator('img').click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.matches('.op-ctype-demo [data-group="outputs"] .op-artwork-slide button'));
      assert.equal(await trigger.evaluate(button => button === document.activeElement), true, 'focus returns to the image trigger rather than BODY');
    });
  });
}

for (const width of [390, 1440]) {
  for (const [index, heading] of ['保持同一张脸', '换一种画风重绘照片', '把品牌放进新场景'].entries()) {
    test(`${width}px: curated ${heading} preserves independent or embedded references truthfully`, async () => {
      await withPage(width, async page => {
        await page.goto(`${baseUrl}/zh/reference-to-image`, { waitUntil: 'domcontentloaded' });
        const article = page.locator('.op-ctype-case').filter({ has: page.getByRole('heading', { name: heading, exact: true }) });
        const inputs = article.locator('[data-group="inputs"] img');
        const outputs = article.locator('[data-group="outputs"] img');
        assert.equal(await inputs.count(), index === 1 ? 0 : 1, `${heading} uses genuine independent inputs or preserves embedded originals`);
        assert.equal(await outputs.count(), index === 0 ? 1 : 2, `${heading} counts complete image files, not collage panels`);
        assert.equal(await article.getByText('参考图未收录', { exact: true }).count(), 0);
        assert.equal(await article.locator('details[open] p').isVisible(), true);
        const url = new URL(await article.locator('.op-ctype-case-actions a').first().getAttribute('href'), page.url());
        assert.equal(url.searchParams.get('template'), ['countryside-film-collage-2a70f109', 'hand-drawn-travel-journal-57d01f1b', 'gpt-image-2-on-chatgpt-f7a4c7af'][index]);
        if (index === 0) {
          assert.equal(await inputs.first().getAttribute('src'), '/creation-references/site-countryside-portrait.jpg');
          assert.equal(await outputs.first().getAttribute('src'), '/creation-results/site-countryside-collage.png');
          assert.equal(await article.getByText(zhMedia.videoPreviewReference, { exact: false }).count(), 0);
          assert.equal(await article.getByText(zhMedia.embeddedReference, { exact: false }).count(), 0, 'all five panels are generated outputs, not an original input');
          assert.equal(await article.getByText(zhMedia.partialReferences, { exact: true }).count(), 0);
          assert.deepEqual(await article.locator('.op-artwork-count').allTextContents(), ['1 / 1', '1 / 1']);
          const catalog = await (await page.request.get(`${baseUrl}/zh/api/prompts`)).json();
          const template = catalog.prompts.find(prompt => prompt.id === 'countryside-film-collage-2a70f109');
          assert.equal(await article.locator('details[open] p').textContent(), template.prompt);
          assert.match(template.prompt, /ONLY facial identity reference/);
          assert.match(template.prompt, /exact same face/);
          await article.locator('[data-group="outputs"]').scrollIntoViewIfNeeded();
          await outputs.first().evaluate(img => img.decode());
          await outputs.first().click();
          await page.getByRole('dialog').waitFor();
          assert.equal(await page.getByRole('dialog').locator('img').evaluate(img => new URL(img.src).searchParams.get('url') ?? img.getAttribute('src')), '/creation-results/site-countryside-collage.png');
          await page.keyboard.press('Escape');
          await page.getByRole('dialog').waitFor({ state: 'detached' });
          await page.waitForFunction(() => document.activeElement?.closest('.op-ctype-case')?.querySelector('a[href*="template=countryside-film-collage-2a70f109"]'));
        }
        if (index === 1) {
          await assertEmbedded(article, embeddedExamples.redraw);
          await assertNaturalImage(outputs.nth(1));
        }
        if (index === 2) {
          const catalog = await (await page.request.get(`${baseUrl}/zh/api/prompts`)).json();
          const template = catalog.prompts.find(prompt => prompt.id === 'gpt-image-2-on-chatgpt-f7a4c7af');
          assert.equal(template.sourceUrl, 'https://x.com/codewithhajra/status/2081352488578326978');
          const demoPrompt = await article.locator('details[open] p').textContent();
          assert.equal(demoPrompt.length, 853);
          assert.match(demoPrompt, /sole product reference/);
          assert.match(template.prompt, /Use only one uploaded product image/);
          assert.match(template.prompt, /Preserve the product 100% 1:1/);
          assert.equal(await inputs.first().getAttribute('src'), '/creation-references/site-cola-product.jpg');
          assert.deepEqual(await outputs.evaluateAll(images => images.map(img => img.getAttribute('src'))), ['/creation-results/site-cola-poster-1.png', '/creation-results/site-cola-poster-2.png']);
          assert.equal(await article.locator('.op-artwork-strip').count(), 2);
          assert.deepEqual(await article.locator('.op-artwork-count').allTextContents(), ['1 / 1', '1 / 2']);
          assert.equal(await article.getByText(zhMedia.embeddedReference, { exact: false }).count(), 0, 'product detail tiles are outputs, not original references');
          assert.equal(await article.getByText(zhMedia.partialReferences, { exact: true }).count(), 0);
          await article.locator('[data-group="outputs"]').scrollIntoViewIfNeeded();
          await assertNaturalImage(outputs.nth(1));
          await outputs.nth(1).click();
          await page.getByRole('dialog').waitFor();
          await page.waitForFunction(() => {
            const strip = document.querySelector('[role="dialog"] .op-viewer-strip');
            return strip && Math.round(strip.scrollLeft / strip.clientWidth) === 1;
          });
          await page.keyboard.press('Escape');
          await page.getByRole('dialog').waitFor({ state: 'detached' });
          await page.waitForFunction(() => document.activeElement?.closest('.op-ctype-case')?.querySelector('a[href*="template=gpt-image-2-on-chatgpt-f7a4c7af"]'));
        }
        await assertNaturalImage(outputs.first());
        await article.screenshot({ path: `/tmp/creation-curated-${width}-${index}.png` });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      });
    });
  }
}

for (const width of [390, 1440]) {
  test(`${width}px: three landing pages use disjoint templates and genuine editing examples`, async () => {
    await withPage(width, async page => {
      const selections = {};
      for (const slug of ['text-to-image', 'reference-to-image', 'image-edit']) {
        await page.goto(`${baseUrl}/zh/${slug}`, { waitUntil: 'domcontentloaded' });
        selections[slug] = await page.locator('.op-ctype-demo-use, .op-ctype-case-actions a.op-landing-btn-primary').evaluateAll(links => links.map(link => new URL(link.href).searchParams.get('template')));
      }
      assert.deepEqual(selections, {
        'text-to-image': [
          'candid-street-fashion-4e88f95c', 'candid-park-portrait-c0cdb8a7', 'raised-city-diorama-5f1ba47b',
          'japanese-bookstore-oni-ta-0974b179', 'wildlife-infographic-image-created-using-gpt-image-7423ba5d',
          'social-media-content-inte-1d046dc1', 'break-the-ice-cola-b47aa197',
        ],
        'reference-to-image': [
          'watercolor-photo-vignette-76967165', 'countryside-film-collage-2a70f109',
          'hand-drawn-travel-journal-57d01f1b', 'travel-field-notes-458ca2b0',
          'gpt-image-2-on-chatgpt-f7a4c7af', 'custom-minifigure-set-16b6425d',
        ],
        'image-edit': ['vintage-photo-restoration-a36b15f4', 'professional-beverage-pho-a092d406'],
      }, 'approved categories retain their exact real catalog templates and order');
      const all = Object.values(selections).flat();
      assert.equal(all.length, 15, 'the approved landing pages contain exactly 15 templates');
      assert.deepEqual(Object.values(selections).map(ids => ids.length), [7, 6, 2]);
      assert.equal(new Set(all).size, 15, 'Hero and ordinary examples do not repeat within or across modes');
      assert.equal(selections['reference-to-image'][0], 'watercolor-photo-vignette-76967165');
      assert.ok(selections['reference-to-image'].includes('travel-field-notes-458ca2b0'));
      assert.ok(selections['reference-to-image'].includes('custom-minifigure-set-16b6425d'));
      assert.equal(selections['reference-to-image'].includes('vintage-photo-restoration-a36b15f4'), false, 'restoration belongs to image editing');
      assert.deepEqual(selections['image-edit'], ['vintage-photo-restoration-a36b15f4', 'professional-beverage-pho-a092d406']);
      const hero = page.locator('.op-ctype-demo');
      await assertEmbedded(hero, embeddedExamples.restoration);
      const product = page.locator('.op-ctype-case');
      assert.equal(await product.locator('[data-group="inputs"] img').count(), 1);
      assert.equal(await product.locator('[data-group="outputs"] img').count(), 1);
      assert.equal(await product.getByText(zhMedia.partialReferences, { exact: true }).count(), 0);
      assert.equal(await product.locator('[data-group="inputs"] img').getAttribute('src'), 'https://pbs.twimg.com/media/HG0vL2oaEAAfTOR.jpg?name=orig');
      assert.equal(await product.locator('[data-group="outputs"] img').getAttribute('src'), 'https://pbs.twimg.com/media/HG0vLkbaIAA30oz.jpg?name=orig');
      assert.ok(await product.getByText('该模板只收录了原帖描述，完整编辑指令未收录。', { exact: true }).count() > 0);
      assert.match(await product.locator('summary').textContent(), /原帖描述/);
      assert.equal(await product.locator('details[open] p').textContent(), 'A transformation of a casual drink photo into a high-end, professional product shot using AI.');
      for (const image of await hero.locator('[data-group="outputs"] img').all()) await assertNaturalImage(image);
      await assertNaturalImage(product.locator('[data-group="inputs"] img'));
      await assertNaturalImage(product.locator('[data-group="outputs"] img'));
      await hero.screenshot({ path: `/tmp/creation-distinct-edit-hero-${width}.png` });
      await product.screenshot({ path: `/tmp/creation-distinct-edit-product-${width}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    });
  });
}

for (const width of [390, 1440]) {
  test(`${width}px: results containing original photos do not repeat extracted references`, async () => {
    await withPage(width, async page => {
      await page.goto(`${baseUrl}/zh/reference-to-image`, { waitUntil: 'domcontentloaded' });
      const hero = page.locator('.op-ctype-demo');
      const redraw = page.locator('.op-ctype-case').filter({ has: page.getByRole('heading', { name: '换一种画风重绘照片', exact: true }) });
      for (const section of [hero, redraw]) {
        await assertEmbedded(section, section === hero ? embeddedExamples.watercolor : embeddedExamples.redraw);
        for (const image of await section.locator('[data-group="outputs"] img').all()) await assertNaturalImage(image);
      }
      const brand = page.locator('.op-ctype-case').filter({ has: page.getByRole('heading', { name: '把品牌放进新场景', exact: true }) });
      assert.equal(await brand.locator('[data-group="inputs"] img').count(), 0);
      assert.equal(await brand.getByText(zhMedia.missingReference, { exact: true }).count(), 1, 'unpublished brand references are not extracted from generated detail panels');
      await hero.screenshot({ path: `/tmp/creation-embedded-hero-${width}.png` });
      await redraw.screenshot({ path: `/tmp/creation-embedded-redraw-${width}.png` });
      await page.goto(`${baseUrl}/zh/image-edit`, { waitUntil: 'domcontentloaded' });
      const editHero = page.locator('.op-ctype-demo');
      await assertEmbedded(editHero, embeddedExamples.restoration);
      assert.equal(await page.locator('.op-ctype-case [data-group="inputs"] img').count(), 1);
      for (const image of await editHero.locator('[data-group="outputs"] img').all()) await assertNaturalImage(image);
      await editHero.screenshot({ path: `/tmp/creation-embedded-edit-${width}.png` });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
    });
  });
}

test('all catalog original images, embedded references, and curated template links remain accessible', async () => {
  await withPage(1440, async page => {
    const gallery = await (await page.request.get(`${baseUrl}/zh/api/prompts`)).json();
    for (const slug of ['text-to-image', 'reference-to-image', 'image-edit']) {
      await page.goto(`${baseUrl}/zh/${slug}`, { waitUntil: 'domcontentloaded' });
      for (const section of await page.locator('.op-ctype-demo, .op-ctype-case').all()) {
        const link = section.locator('.op-ctype-demo-use, .op-ctype-case-actions a').first();
        const id = new URL(await link.getAttribute('href'), page.url()).searchParams.get('template');
        const original = gallery.prompts.find(p => p.id === id);
        assert.ok(original, `${id} is a real catalog template`);
        const rendered = await section.locator('.op-artwork img').evaluateAll(images => images.map(img => img.getAttribute('src')));
        if (new URL(await link.getAttribute('href'), page.url()).searchParams.get('demo') === 'site') {
          assert.equal(slug, 'reference-to-image');
          assert.ok(rendered.every(src => src.startsWith('/creation-references/') || src.startsWith('/creation-results/')), `${id} uses local qualified demo assets`);
          assert.ok(await section.locator('.op-ctype-case-actions a').nth(1).getAttribute('href'), `${id} keeps the original template detail link`);
        } else {
          for (const src of original.images) assert.ok(rendered.includes(src), `${id} preserves ${src}`);
        }
      }
      if (slug === 'reference-to-image') {
        for (const [heading, id] of [['系列海报与分镜', 'travel-field-notes-458ca2b0'], ['手办与雕塑', 'custom-minifigure-set-16b6425d']]) {
          const article = page.locator('.op-ctype-case').filter({ has: page.getByRole('heading', { name: heading, exact: true }) });
          const url = new URL(await article.locator('.op-ctype-case-actions a').first().getAttribute('href'), page.url());
          assert.equal(url.searchParams.get('template'), id);
          assert.equal(await article.locator('[data-group="inputs"]').count(), 0, 'the original-photo region is already inside the preserved complete output');
          assert.equal(await article.locator('[data-group="outputs"] img').count(), id === 'travel-field-notes-458ca2b0' ? 2 : 1);
          assert.equal(await article.getByText(zhMedia.embeddedReference, { exact: false }).count(), 0);
          assert.equal(await article.getByText(zhMedia.partialReferences, { exact: true }).count(), 0);
          assert.equal(await article.locator('.op-artwork-origin').count(), 0);
        }
        const hero = page.locator('.op-ctype-demo');
        await hero.locator('summary').click();
        const prompt = await hero.locator('.op-ctype-demo-prompt').textContent();
        await hero.locator('.op-ctype-demo-use').click();
        await page.waitForFunction(expected => document.querySelector('#op-create-prompt')?.value === expected, prompt);
        assert.equal(await page.locator('main select').first().inputValue(), 'reference');
      }
      if (slug === 'image-edit') {
        await assertEmbedded(page.locator('.op-ctype-demo'), embeddedExamples.restoration);
        assert.equal(await page.locator('[data-group="unclassified"]').count(), 0, 'unselected unknown-role templates are not invented on the editing page');
        assert.equal(await page.getByText(zhMedia.mismatch, { exact: true }).count(), 0);
      }
    }
  });
});

test('eight locales render all modes with localized media controls and status labels', async () => {
  await withPage(900, async page => {
    const fs = require('node:fs');
    for (const locale of ['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt']) {
      const messages = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'messages', `${locale}.json`), 'utf8'));
      const labels = messages.OpenPrompts.creationTypes.common.media;
      await page.goto(`${baseUrl}/${locale}`, { waitUntil: 'domcontentloaded' });
      const homeCards = page.locator('section[aria-labelledby="creation-types"] .op-ctype-card');
      const heroNav = page.locator('.op-landing-hero .op-landing-creation-nav');
      assert.equal(await heroNav.locator('a').count(), 3);
      assert.equal(await heroNav.getAttribute('aria-label'), messages.OpenPrompts.creationTypes.section.title);
      assert.equal(await homeCards.locator('.op-ctype-preview img').count(), 3);
      for (const [i, [slug, key]] of [
        ['text-to-image', 'textToImage'], ['reference-to-image', 'referenceToImage'], ['image-edit', 'imageEdit'],
      ].entries()) {
        assert.equal(await heroNav.locator('a').nth(i).getAttribute('href'), `${locale === 'en' ? '' : `/${locale}`}/${slug}`);
        assert.equal(await heroNav.locator('a').nth(i).textContent(), messages.OpenPrompts.creationTypes.types[key].name);
        assert.equal(await homeCards.nth(i).locator('.op-ctype-preview').getAttribute('href'), `${locale === 'en' ? '' : `/${locale}`}/${slug}`);
        assert.ok((await homeCards.nth(i).locator('img').getAttribute('alt')).startsWith(messages.OpenPrompts.creationTypes.types[key].name));
      }
      assert.doesNotMatch((await homeCards.allTextContents()).join(' '), /MISSING_MESSAGE|creationTypes\./);
      for (const slug of ['text-to-image', 'reference-to-image', 'image-edit']) {
        const response = await page.goto(`${baseUrl}/${locale}/${slug}`, { waitUntil: 'domcontentloaded' });
        assert.equal(response.status(), 200);
        assert.equal(await page.locator('.op-ctype-case').count(), caseCounts[slug]);
        assert.equal(await page.locator('.op-ctype-demo [data-group="outputs"] .op-artwork-label').textContent(), labels.outputs);
        if (slug !== 'text-to-image') await assertEmbedded(page.locator('.op-ctype-demo'), embeddedExamples[slug === 'reference-to-image' ? 'watercolor' : 'restoration'], labels);
        if (slug === 'reference-to-image') {
          const character = page.locator('.op-ctype-case').filter({ has: page.locator('a[href*="template=countryside-film-collage-2a70f109"]') });
          assert.equal(await character.locator('[data-group="inputs"] img').count(), 0);
          assert.equal(await character.locator('[data-group="outputs"] img').count(), 1);
          assert.equal(await character.getByText(labels.videoPreviewReference, { exact: false }).count(), 0);
          assert.equal(await character.getByText(labels.missingReference, { exact: true }).count(), 1);
          const brand = page.locator('.op-ctype-case').filter({ has: page.locator('a[href*="template=gpt-image-2-on-chatgpt-f7a4c7af"]') });
          assert.equal(await brand.locator('[data-group="inputs"] img').count(), 0);
          assert.equal(await brand.locator('[data-group="outputs"] img').count(), 2);
          assert.equal(await brand.getByText(labels.missingReference, { exact: true }).count(), 1);
          assert.equal(await page.getByText(labels.missingReference, { exact: true }).count(), 2, 'unpublished identity and product inputs each have a missing-reference notice');
          assert.equal(await page.getByText(labels.partialReferences, { exact: true }).count(), 0);
          const redraw = page.locator('.op-ctype-case').filter({ has: page.locator('a[href*="template=hand-drawn-travel-journal-57d01f1b"]') });
          await assertEmbedded(redraw, embeddedExamples.redraw, labels);
        }
        if (slug === 'image-edit') {
          const product = page.locator('.op-ctype-case');
          assert.equal(await product.getByText(labels.promptDescriptionOnly, { exact: true }).count(), 1);
          assert.ok((await product.locator('summary').textContent()).startsWith(`${labels.sourceDescription} · `));
          assert.equal(await product.locator('details[open] p').textContent(), 'A transformation of a casual drink photo into a high-end, professional product shot using AI.');
          assert.equal(await product.locator('[data-group="inputs"] img').count(), 1);
          assert.equal(await product.locator('[data-group="outputs"] img').count(), 1);
          assert.equal(await page.getByText(labels.partialReferences, { exact: true }).count(), 0);
        }
        assert.doesNotMatch(await page.locator('body').textContent(), /MISSING_MESSAGE|creationTypes\.common\.media\./);
      }
    }
  });
});

test('pending complete output tiles remain directly accessible before and after loading', async () => {
  await withPage(1440, async page => {
    let release, requested;
    const pending = new Promise(resolve => { release = resolve; });
    const outputRequested = new Promise(resolve => { requested = resolve; });
    await page.route('**/media/HRwBR6ZaIAAhEdX.jpg*', async route => {
      requested();
      await pending;
      await route.continue();
    });
    try {
      await page.goto(`${baseUrl}/zh/reference-to-image`, { waitUntil: 'domcontentloaded' });
      const outputs = page.locator('.op-ctype-demo [data-group="outputs"]');
      await assertNaturalImage(outputs.locator('img').first());
      await outputs.locator('img').nth(1).scrollIntoViewIfNeeded();
      await outputRequested;
      assert.equal(await outputs.locator('img').nth(1).evaluate(img => img.naturalWidth), 0, 'the second tile is still pending');
      assert.equal(await outputs.locator('.op-artwork-grid button[tabindex="0"]').count(), 2);
      assert.equal(await outputs.locator('img').nth(1).getAttribute('src'), embeddedExamples.watercolor.outputs[1]);
      release();
      await assertNaturalImage(outputs.locator('img').nth(1));
      assert.equal(await outputs.locator('.op-artwork-count').textContent(), '2');
      assert.equal(await outputs.locator('.op-artwork-grid').evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
    } finally {
      release();
    }
  });
});

test('an image that fails before hydration shows its localized status without blocking another tile', async () => {
  await withPage(1440, async page => {
    await page.route('**/media/HRwBR6UaQAA40-1.jpg*', route => route.abort());
    await page.goto(`${baseUrl}/zh/reference-to-image`, { waitUntil: 'domcontentloaded' });
    const outputs = page.locator('.op-ctype-demo [data-group="outputs"]');
    await outputs.locator('.op-artwork-error').waitFor();
    const messages = require('../messages/zh.json');
    assert.equal(await outputs.locator('.op-artwork-error').textContent(), messages.OpenPrompts.gallery.coverLoadFailed);
    assert.ok((await outputs.locator('.op-artwork-grid').boundingBox()).height >= 64);
    await assertNaturalImage(outputs.locator('.op-artwork-slide').nth(1).locator('img'));
    assert.equal(await outputs.locator('.op-artwork-count').textContent(), '2');
    const second = outputs.locator('.op-artwork-grid button').nth(1);
    await second.click();
    await page.getByRole('dialog').waitFor();
    await page.waitForFunction(() => document.querySelector('.op-viewer-counter')?.textContent === '2 / 2');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.activeElement?.matches('.op-ctype-demo .op-artwork-grid button'));
    assert.equal(await second.evaluate(el => el === document.activeElement), true);
    assert.equal(await outputs.locator('.op-artwork-error').textContent(), messages.OpenPrompts.gallery.coverLoadFailed);
  });
});

test('synthetic fixture: a single output stays stable while multiple crop-less inputs scroll and resize', async () => {
  await withPage(390, async page => {
    const inputUrls = ['/creation-references/watercolor-lakeside-reference.jpg', '/creation-references/watercolor-cats-reference.jpg'];
    const outputUrl = '/creation-references/hand-drawn-travel-journal-fuji-reference.jpg';
    const article = await mountMediaFixture(page, {
      inputs: inputUrls.map(src => ({ src, origin: { sourceUrl: embeddedExamples.watercolor.source, extractedFrom: outputUrl } })),
      outputs: [outputUrl], unclassified: [], partialInputs: false,
    });
    const inputs = article.locator('[data-group="inputs"]');
    const outputs = article.locator('[data-group="outputs"]');
    assert.equal(await inputs.locator('img').count(), 2, 'crop-less source relationships do not hide independent references');
    assert.equal(await outputs.locator('img').count(), 1);
    assert.equal(await outputs.locator('.op-artwork-controls button').count(), 0);
    await assertNaturalImage(inputs.locator('img').first());
    await assertNaturalImage(outputs.locator('img'));
    await scrollRail(page, inputs, 1);
    await assertRailSelection(inputs, 1, inputUrls[1], 2);
    await assertRailSelection(outputs, 0, outputUrl, 1);
    await page.setViewportSize({ width: 1440, height: 900 });
    await assertRailSelection(inputs, 1, inputUrls[1], 2);
    await assertRailSelection(outputs, 0, outputUrl, 1);
    await assertNaturalImage(inputs.locator('img').nth(1));
    await scrollRail(page, outputs, 1);
    await assertRailSelection(outputs, 0, outputUrl, 1);
    await assertRailSelection(inputs, 1, inputUrls[1], 2);
    const trigger = inputs.locator('.op-artwork-slide button').nth(1);
    await trigger.click();
    await page.waitForFunction(() => {
      const strip = document.querySelector('[role="dialog"] .op-viewer-strip');
      return strip && Math.round(strip.scrollLeft / strip.clientWidth) === 1 && document.querySelector('.op-viewer-counter')?.textContent === '2 / 2';
    });
    assert.deepEqual(await page.getByRole('dialog').locator('.op-viewer-slide img').evaluateAll(images => images.map(img => {
      const src = img.getAttribute('src');
      const url = new URL(src, document.baseURI);
      return url.pathname === '/_next/image' ? url.searchParams.get('url') : src;
    })), inputUrls, 'the actual viewer preserves the local reference URLs, including Next image-loader wrappers');
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'detached' });
    await page.waitForFunction(() => document.activeElement?.matches('#creation-media-fixture [data-group="inputs"] .op-artwork-slide button'));
    assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
    await assertRailSelection(outputs, 0, outputUrl, 1);
    await page.setViewportSize({ width: 390, height: 900 });
    await assertRailSelection(inputs, 1, inputUrls[1], 2);
    await assertRailSelection(outputs, 0, outputUrl, 1);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
  });
});

for (const width of [390, 1440]) {
  test(`${width}px: synthetic fixture synchronizes unequal many-to-many groups by source URL, never index or unknown role`, async () => {
    await withPage(width, async page => {
      const inputUrls = [
        '/creation-references/watercolor-lakeside-reference.jpg',
        '/creation-references/watercolor-cats-reference.jpg',
        '/creation-references/hand-drawn-travel-journal-fuji-reference.jpg',
        '/creation-references/hand-drawn-travel-journal-dubai-reference.jpg',
      ];
      const outputUrls = [
        '/creation-references/travel-field-notes-tokyo-reference.jpg',
        '/creation-references/travel-field-notes-osaka-reference.jpg',
        '/creation-references/custom-minifigure-set-reference.jpg',
      ];
      const unknownUrls = [
        '/creation-references/ferris-wheel-fashion-ink-f2c707f5-reference-1.jpg',
        '/creation-references/ferris-wheel-fashion-ink-f2c707f5-reference-2.jpg',
      ];
      const hiddenCrop = '/creation-references/vintage-photo-restoration-couple-reference.jpg';
      const sourceUrl = embeddedExamples.redraw.source;
      const article = await mountMediaFixture(page, {
        inputs: [
          { src: inputUrls[0], origin: { sourceUrl, extractedFrom: outputUrls[2] } },
          { src: inputUrls[1], origin: { sourceUrl, extractedFrom: outputUrls[0] } },
          { src: inputUrls[2], origin: { sourceUrl, extractedFrom: outputUrls[2] } },
          { src: inputUrls[3], origin: { sourceUrl, extractedFrom: '/creation-references/vintage-photo-restoration-portrait-reference.jpg', crop: [0, 0, 10, 10] } },
          { src: hiddenCrop, origin: { sourceUrl, extractedFrom: outputUrls[1], crop: [0, 0, 10, 10] } },
        ],
        outputs: outputUrls, unclassified: unknownUrls, partialInputs: true,
      });
      const inputs = article.locator('[data-group="inputs"]');
      const outputs = article.locator('[data-group="outputs"]');
      const unknown = article.locator('[data-group="unclassified"]');
      assert.deepEqual(await inputs.locator('img').evaluateAll(images => images.map(img => img.getAttribute('src'))), inputUrls, 'only the crop whose source belongs to outputs is hidden; crop-less and absent-source references remain');
      assert.equal(await article.locator(`img[src="${hiddenCrop}"]`).count(), 0);
      assert.equal(await article.getByText(zhMedia.partialReferences, { exact: true }).count(), 1, 'remaining independent partial references still have a notice');
      assert.equal(await unknown.locator('.op-artwork-label').textContent(), zhMedia.unclassified);
      for (const image of await article.locator('.op-artwork img').all()) await assertNaturalImage(image);
      await selectRail(inputs, 0);
      await assertRailSelection(inputs, 0, inputUrls[0], 4);
      await assertRailSelection(outputs, 2, outputUrls[2], 3);
      await selectRail(outputs, 0);
      await assertRailSelection(outputs, 0, outputUrls[0], 3);
      await assertRailSelection(inputs, 1, inputUrls[1], 4);
      await selectRail(outputs, 2);
      await assertRailSelection(outputs, 2, outputUrls[2], 3);
      await assertRailSelection(inputs, 0, inputUrls[0], 4);
      await selectRail(inputs, 2);
      await assertRailSelection(inputs, 2, inputUrls[2], 4);
      await assertRailSelection(outputs, 2, outputUrls[2], 3);
      await selectRail(outputs, 1);
      await assertRailSelection(outputs, 1, outputUrls[1], 3);
      await assertRailSelection(inputs, 2, inputUrls[2], 4);
      assert.equal(await outputs.getByText(zhMedia.embeddedReference, { exact: false }).count(), 0);
      assert.equal(await outputs.locator('.op-artwork-origin').count(), 0);
      await selectRail(outputs, 2);
      await assertRailSelection(outputs, 2, outputUrls[2], 3);
      await assertRailSelection(inputs, 2, inputUrls[2], 4); // Keep the current matching input, not the first match.
      await selectRail(inputs, 3);
      await assertRailSelection(inputs, 3, inputUrls[3], 4);
      await assertRailSelection(outputs, 2, outputUrls[2], 3); // Absent source cannot move outputs by index.
      await selectRail(unknown, 0);
      await assertRailSelection(unknown, 0, unknownUrls[0], 2);
      await selectRail(unknown, 1);
      await assertRailSelection(unknown, 1, unknownUrls[1], 2);
      await assertRailSelection(inputs, 3, inputUrls[3], 4);
      await assertRailSelection(outputs, 2, outputUrls[2], 3);
      await selectRail(outputs, 0);
      await assertRailSelection(outputs, 0, outputUrls[0], 3);
      await assertRailSelection(inputs, 1, inputUrls[1], 4);
      await assertRailSelection(unknown, 1, unknownUrls[1], 2);
      await page.setViewportSize({ width: width === 390 ? 1440 : 390, height: 900 });
      await assertRailSelection(inputs, 1, inputUrls[1], 4);
      await assertRailSelection(outputs, 0, outputUrls[0], 3);
      await assertRailSelection(unknown, 1, unknownUrls[1], 2);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width === 390 ? 1440 : 390);
    });
  });
}

test('synthetic fixture preserves truthful missing, mismatch and unclassified states without pairing unknown images', async () => {
  await withPage(390, async page => {
    const outputUrl = '/creation-references/travel-field-notes-tokyo-reference.jpg';
    const unknownUrls = ['/creation-references/watercolor-lakeside-reference.jpg', '/creation-references/watercolor-cats-reference.jpg'];
    const article = await mountMediaFixture(page, { inputs: [], outputs: [outputUrl], unclassified: unknownUrls, partialInputs: true }, { contentMismatch: true });
    assert.equal(await article.locator('[data-group="inputs"]').count(), 0);
    assert.equal(await article.getByText(zhMedia.missingReference, { exact: true }).count(), 1);
    assert.equal(await article.getByText(zhMedia.partialReferences, { exact: true }).count(), 0);
    assert.equal(await article.getByText(zhMedia.mismatch, { exact: true }).count(), 1);
    assert.equal(await article.locator('.is-paired').count(), 0);
    const outputs = article.locator('[data-group="outputs"]');
    const unknown = article.locator('[data-group="unclassified"]');
    assert.deepEqual(await unknown.locator('img').evaluateAll(images => images.map(img => img.getAttribute('src'))), unknownUrls);
    await assertNaturalImage(unknown.locator('img').first());
    await scrollRail(page, unknown, 1);
    await assertRailSelection(unknown, 1, unknownUrls[1], 2);
    assert.equal(await outputs.locator('.op-artwork-grid img').getAttribute('src'), outputUrl);
    assert.equal(await outputs.locator('.op-artwork-count').textContent(), '1');
    assert.equal(await unknown.locator('.op-artwork-origin').count(), 0, 'unknown roles do not acquire invented provenance');
  });
});

test('DM Sans UI weights load through the existing Turbopack service', async () => {
  await withPage(1440, async page => {
    const response = await page.goto(`${baseUrl}/zh/reference-to-image`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    const fonts = await page.evaluate(async () => {
      const family = getComputedStyle(document.querySelector('.op-landing-root')).getPropertyValue('--font-dm-sans').split(',')[0].trim();
      return Promise.all([300, 400, 500].map(async weight => {
        const faces = await document.fonts.load(`${weight} 16px ${family}`, 'Open Prompts');
        return { weight, count: faces.length, loaded: faces.every(face => face.status === 'loaded') };
      }));
    });
    for (const font of fonts) { assert.ok(font.count > 0); assert.equal(font.loaded, true); }
  });
});
