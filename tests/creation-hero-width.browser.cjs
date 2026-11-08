const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseUrl = process.env.HERO_TEST_BASE_URL || 'http://localhost:3000';

for (const width of [900, 1200, 1440]) {
  test(`${width}px: product retouching aligns pictures independently of source captions`, async () => {
    const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    const forbidden = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.method() !== 'GET' && /\/api\/(generations|upload)/.test(request.url())) forbidden.push(request.url());
    });
    await page.route('**/api/generations**', route => route.abort());
    try {
      await page.goto(`${baseUrl}/zh/image-edit`, { waitUntil: 'domcontentloaded' });
      const article = page.locator('.op-ctype-case');
      for (const image of await article.locator('.op-artwork img').all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate(img => img.decode());
      }
      const bounds = await article.locator('[data-group]').evaluateAll(groups => groups.map(group => {
        const img = group.querySelector('img');
        const rect = img.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom, ratio: (rect.width / rect.height) / (img.naturalWidth / img.naturalHeight) };
      }));
      assert.ok(Math.abs(bounds[0].top - bounds[1].top) < 1, 'input and output picture tops align even when only the input has a source caption');
      assert.ok(Math.abs(bounds[0].bottom - bounds[1].bottom) < 1);
      assert.ok(bounds.every(bound => Math.abs(bound.ratio - 1) < 0.005));
      assert.equal(await article.locator('.op-artwork-origin a').getAttribute('href'), 'https://x.com/abxxai/status/2048345290043015628');
      assert.equal(await article.locator('[data-group="inputs"] img').getAttribute('src'), 'https://pbs.twimg.com/media/HG0vL2oaEAAfTOR.jpg?name=orig');
      assert.equal(await article.locator('[data-group="outputs"] img').getAttribute('src'), 'https://pbs.twimg.com/media/HG0vLkbaIAA30oz.jpg?name=orig');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await article.screenshot({ path: `/tmp/creation-retouch-aligned-${width}.png` });
      assert.deepEqual(errors, []);
      assert.deepEqual(forbidden, []);
    } finally {
      await browser.close();
    }
  });
}

test('all creation landing examples omit model-name badges without losing template actions', async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const forbidden = [];
  page.on('request', request => {
    if (request.method() !== 'GET' && /\/api\/(generations|upload)/.test(request.url())) forbidden.push(request.url());
  });
  await page.route('**/api/generations**', route => route.abort());
  try {
    for (const slug of ['text-to-image', 'reference-to-image', 'image-edit']) {
      await page.goto(`${baseUrl}/zh/${slug}`, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.locator('.op-ctype-demo .op-browser-badge, .op-ctype-case-media .op-browser-badge').count(), 0);
      assert.equal(await page.locator('.op-ctype-demo-use').count(), 1);
      assert.ok(await page.locator('.op-ctype-case-actions a').count() > 0);
    }
    assert.deepEqual(forbidden, []);
  } finally {
    await browser.close();
  }
});

for (const width of [320, 390, 900, 1200, 1440]) {
  for (const slug of ['text-to-image', 'reference-to-image', 'image-edit']) {
    test(`${width}px: ${slug} Hero hugs its artwork without side gutters`, async () => {
      const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      const errors = [];
      const imageFailures = [];
      page.on('requestfailed', request => {
        if (request.resourceType() === 'image') imageFailures.push({ url: request.url(), failure: request.failure()?.errorText });
      });
      page.on('response', response => {
        if (response.request().resourceType() === 'image' && response.status() >= 400) imageFailures.push({ url: response.url(), status: response.status() });
      });
      const forbiddenRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => {
        if (request.method() !== 'GET' && /\/api\/(generations|upload)/.test(request.url())) forbiddenRequests.push(request.url());
      });
      await page.route('**/api/generations**', route => route.abort());
      try {
        assert.equal((await page.goto(`${baseUrl}/zh/${slug}`, { waitUntil: 'domcontentloaded' })).status(), 200);
        const hero = page.locator('.op-ctype-demo');
        const group = hero.locator('[data-group="outputs"]');
        const grid = group.locator('.op-artwork-grid');
        assert.equal(await grid.count(), 1);
        assert.equal(await group.locator('.op-artwork-strip').count(), 0);
        for (const image of await grid.locator('img').all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(img => img.decode());
          const bounds = await image.evaluate(img => {
            const image = img.getBoundingClientRect();
            const tile = img.closest('.op-artwork-slide').getBoundingClientRect();
            return { left: image.left - tile.left, right: tile.right - image.right, ratio: (image.width / image.height) / (img.naturalWidth / img.naturalHeight), height: image.height };
          });
          assert.ok(Math.abs(bounds.left) < 2 && Math.abs(bounds.right) < 2, 'tiles hug their artwork without side gutters');
          assert.ok(Math.abs(bounds.ratio - 1) < 0.005);
          assert.ok(bounds.height <= (width < 768 ? 352 : 512));
        }
        if (slug === 'text-to-image') {
          const heights = await grid.locator('img').evaluateAll(images => images.map(img => img.getBoundingClientRect().height));
          assert.ok(Math.max(...heights) - Math.min(...heights) < 1, 'all text Hero images have equal heights despite different original ratios');
        }
        assert.ok(Math.abs((await hero.boundingBox()).width - (await grid.boundingBox()).width) < 2, 'the Hero wrapper hugs the complete tiled results');
        assert.equal(await hero.locator('details[open]').count(), 0);
        if (slug !== 'text-to-image') {
          assert.equal(await hero.locator('[data-group="inputs"]').count(), 0);
          assert.equal(await hero.getByText('仅补齐部分参考区域，原始输入仍不完整。', { exact: true }).count(), 0);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        await page.locator('.op-ctype-hero').screenshot({ path: `/tmp/creation-compact-hero-${slug}-${width}.png` });
        const count = await grid.locator('img').count();
        const last = grid.locator('button').nth(count - 1);
        await last.click();
        await page.getByRole('dialog').waitFor();
        await page.waitForFunction(index => {
          const el = document.querySelector('[role="dialog"] .op-viewer-strip');
          return el && Math.round(el.scrollLeft / el.clientWidth) === index;
        }, count - 1);
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'detached' });
        await page.waitForFunction(() => document.activeElement?.matches('.op-ctype-demo .op-artwork-grid button'));
        assert.equal(await last.evaluate(el => el === document.activeElement), true);
        await page.setViewportSize({ width: width < 768 ? 1440 : 390, height: 900 });
        assert.equal(await group.locator('.op-artwork-count').textContent(), String(count));
        await page.waitForFunction(() => {
          const hero = document.querySelector('.op-ctype-demo');
          const grid = hero.querySelector('.op-artwork-grid');
          return Math.abs(hero.getBoundingClientRect().width - grid.getBoundingClientRect().width) < 2 && grid.scrollWidth <= grid.clientWidth + 1;
        });
        if (slug === 'text-to-image') {
          await page.waitForFunction(() => {
            const heights = Array.from(document.querySelectorAll('.op-ctype-demo .op-artwork-grid img'), img => img.getBoundingClientRect().height);
            return Math.max(...heights) - Math.min(...heights) < 1;
          });
        }
        assert.equal(await grid.locator('button[tabindex="0"]').count(), count);
        assert.deepEqual(errors, []);
        assert.deepEqual(forbiddenRequests, []);
      } catch (error) {
        console.error({ width, slug, imageFailures, artwork: await page.locator('.op-ctype-demo').textContent() });
        throw error;
      } finally {
        await browser.close();
      }
    });
  }
}
