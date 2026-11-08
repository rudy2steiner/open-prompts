const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const baseUrl = process.env.HERO_TEST_BASE_URL || 'http://localhost:3000';

for (const viewport of [{ width: 390, height: 900 }, { width: 900, height: 900 }, { width: 1200, height: 900 }, { width: 1440, height: 900 }, { width: 390, height: 600 }]) {
  test(`${viewport.width}×${viewport.height}: readable-text posters use equal-height, naturally proportioned artwork`, async () => {
    const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
    const page = await browser.newPage({ viewport });
    const errors = [];
    const forbidden = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.method() !== 'GET' && /\/api\/(generations|upload)/.test(request.url())) forbidden.push(request.url());
    });
    await page.route('**/api/generations**', route => route.abort());
    try {
      await page.goto(`${baseUrl}/text-to-image`, { waitUntil: 'domcontentloaded' });
      const article = page.locator('.op-ctype-case').filter({ has: page.locator('a[href*="template=raised-city-diorama-5f1ba47b"]') });
      await article.locator('[data-group="outputs"]').scrollIntoViewIfNeeded();
      const images = article.locator('.op-artwork-grid img');
      assert.equal(await images.count(), 2);
      for (const image of await images.all()) await image.evaluate(img => img.decode());
      await page.waitForFunction(() => {
        const article = document.querySelector('a[href*="template=raised-city-diorama-5f1ba47b"]').closest('.op-ctype-case');
        const heights = Array.from(article.querySelectorAll('.op-artwork-grid img'), img => img.getBoundingClientRect().height);
        return Math.max(...heights) - Math.min(...heights) < 1;
      }, undefined, { timeout: 3000 });
      const sizes = await images.evaluateAll(images => images.map(img => {
        const r = img.getBoundingClientRect();
        const tile = img.closest('.op-artwork-slide').getBoundingClientRect();
        return { width: r.width, height: r.height, ratio: (r.width / r.height) / (img.naturalWidth / img.naturalHeight), gutters: Math.abs(r.left - tile.left) + Math.abs(r.right - tile.right) };
      }));
      assert.ok(Math.abs(sizes[0].height - sizes[1].height) < 1);
      assert.ok(sizes.every(size => Math.abs(size.ratio - 1) < 0.005 && size.gutters < 2));
      const cap = viewport.width < 768 ? Math.min(352, viewport.height * 0.5) : Math.min(512, viewport.height * 0.62);
      assert.ok(sizes.every(size => size.height <= cap + 1));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), viewport.width);
      await article.screenshot({ path: `/tmp/creation-equal-height-posters-${viewport.width}-${viewport.height}.png` });
      assert.deepEqual(errors, []);
      assert.deepEqual(forbidden, []);
    } finally {
      await browser.close();
    }
  });
}

for (const width of [390, 900, 1440]) {
  test(`${width}px: product advertising shows the campaign preview beside its storyboard`, async () => {
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
      await page.goto(`${baseUrl}/zh/text-to-image`, { waitUntil: 'domcontentloaded' });
      const article = page.locator('.op-ctype-case').filter({ has: page.locator('a[href*="template=break-the-ice-cola-b47aa197"]') });
      assert.equal(await article.locator('[data-group="inputs"], [data-group="unclassified"]').count(), 0);
      const outputs = article.locator('[data-group="outputs"]');
      const images = outputs.locator('.op-artwork-grid img');
      assert.deepEqual(await images.evaluateAll(images => images.map(img => img.getAttribute('src'))), [
        'https://pbs.twimg.com/amplify_video_thumb/2102504103339589632/img/C0k4i2idT6PmxzHY.jpg',
        'https://pbs.twimg.com/media/HS2YV5nb0AAgiKj.jpg?name=orig',
      ]);
      await outputs.scrollIntoViewIfNeeded();
      for (const image of await images.all()) await image.evaluate(img => img.decode());
      await page.waitForFunction(() => {
        const article = document.querySelector('a[href*="template=break-the-ice-cola-b47aa197"]').closest('.op-ctype-case');
        const images = Array.from(article.querySelectorAll('.op-artwork-grid img'), img => img.getBoundingClientRect());
        return images.length === 2 && Math.abs(images[0].top - images[1].top) < 1 && Math.abs(images[0].height - images[1].height) < 1;
      });
      const sizes = await images.evaluateAll(images => images.map(img => {
        const r = img.getBoundingClientRect();
        return { left: r.left, right: r.right, ratio: (r.width / r.height) / (img.naturalWidth / img.naturalHeight), height: r.height };
      }));
      assert.ok(sizes[0].right <= sizes[1].left);
      assert.ok(sizes.every(size => Math.abs(size.ratio - 1) < 0.005 && size.height <= (width < 768 ? 352 : 512)));
      assert.equal(await outputs.locator('.op-artwork-count').textContent(), '2');
      assert.equal(await article.getByText('原模板附图（角色未核实）', { exact: true }).count(), 0);
      await article.screenshot({ path: `/tmp/creation-cola-side-by-side-${width}.png` });
      const last = outputs.locator('button').nth(1);
      await last.click();
      const viewer = page.getByRole('dialog');
      await viewer.waitFor();
      await page.waitForFunction(() => {
        const el = document.querySelector('[role="dialog"] .op-viewer-strip');
        return el && Math.round(el.scrollLeft / el.clientWidth) === 1;
      });
      assert.equal(await viewer.locator('.op-viewer-counter').textContent(), '2 / 2');
      await page.keyboard.press('Escape');
      await viewer.waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.matches('.op-artwork-grid button'));
      assert.equal(await last.evaluate(el => el === document.activeElement), true);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      assert.deepEqual(errors, []);
      assert.deepEqual(forbidden, []);
    } finally {
      await browser.close();
    }
  });
}

for (const width of [320, 390, 900, 1440]) {
  for (const [heading, count] of [['Redraw a photo in a new style', 2], ['Campaigns and storyboards', 2], ['Figures and sculptures', 1]]) {
    test(`${width}px: ${heading} shows every result without a scrolling or oversized empty column`, async () => {
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
        await page.goto(`${baseUrl}/en/reference-to-image`, { waitUntil: 'domcontentloaded' });
        const article = page.locator('.op-ctype-case').filter({ has: page.getByRole('heading', { name: heading, exact: true }) });
        const outputs = article.locator('[data-group="outputs"]');
        assert.equal(await article.locator('[data-group="inputs"]').count(), 0);
        assert.equal(await outputs.locator('.op-artwork-strip').count(), 0, 'standalone results are not hidden behind horizontal scrolling');
        const grid = outputs.locator('.op-artwork-grid');
        assert.equal(await grid.count(), 1);
        assert.equal(await grid.locator('img').count(), count);
        for (const image of await grid.locator('img').all()) {
          await image.scrollIntoViewIfNeeded();
          await image.evaluate(img => img.decode());
          const size = await image.evaluate(img => {
            const r = img.getBoundingClientRect();
            const g = img.closest('.op-artwork-grid').getBoundingClientRect();
            return { inside: r.left >= g.left - 1 && r.right <= g.right + 1 && r.top >= g.top - 1 && r.bottom <= g.bottom + 1, height: r.height, ratio: (r.width / r.height) / (img.naturalWidth / img.naturalHeight) };
          });
          assert.equal(size.inside, true, 'each complete image is laid out within the grid');
          assert.ok(Math.abs(size.ratio - 1) < 0.005);
          assert.ok(size.height <= (width < 768 ? 352 : 512));
        }
        assert.equal(await grid.evaluate(el => el.scrollWidth > el.clientWidth + 1), false);
        assert.equal(await grid.locator('button[tabindex="0"]').count(), count, 'every result can be opened directly');
        assert.equal(await outputs.locator('.op-artwork-count').textContent(), String(count));
        assert.equal(await outputs.locator('.op-artwork-origin').count(), 0, 'source captions are omitted while all original composites remain accessible');
        if (width >= 1200) {
          const spacing = await article.evaluate(el => {
            const m = el.querySelector('.op-ctype-case-media').getBoundingClientRect();
            const c = el.querySelector('.op-ctype-case-copy').getBoundingClientRect();
            return m.right <= c.left ? c.left - m.right : m.left - c.right;
          });
          assert.ok(spacing >= 0 && spacing <= 40, 'copy sits beside the actual artwork instead of an oversized media column');
        }
        const last = grid.locator('button').nth(count - 1);
        await last.click();
        const viewer = page.getByRole('dialog');
        await viewer.waitFor();
        await page.waitForFunction(expected => {
          const el = document.querySelector('[role="dialog"] .op-viewer-strip');
          return el && Math.round(el.scrollLeft / el.clientWidth) === expected;
        }, count - 1);
        if (count > 1) assert.equal(await viewer.locator('.op-viewer-counter').textContent(), `${count} / ${count}`);
        else assert.equal(await viewer.locator('.op-viewer-counter').count(), 0);
        assert.equal(await viewer.locator('.op-viewer-slide img').count(), count);
        await page.keyboard.press('Escape');
        await viewer.waitFor({ state: 'detached' });
        await page.waitForFunction(() => document.activeElement?.matches('.op-artwork-grid button'));
        assert.equal(await last.evaluate(el => el === document.activeElement), true);
        await article.screenshot({ path: `/tmp/creation-tiles-${heading.toLowerCase().replaceAll(' ', '-')}-${width}.png` });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        assert.deepEqual(errors, []);
        assert.deepEqual(forbidden, []);
      } finally {
        await browser.close();
      }
    });
  }
}
