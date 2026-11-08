const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

for (const [width, locale] of [[390, 'zh'], [1440, 'zh'], [1440, 'en']]) {
  test(`credits/${width}px/${locale}: button quotes every open parameter combination without submitting`, async () => {
    const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 });
    const page = await context.newPage();
    const errors = [];
    let submissions = 0;
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/api/auth/session', route => route.fulfill({ json: { user: { id: 'credits-test', name: 'Test' }, expires: '2099-01-01T00:00:00Z' } }));
    await context.route('**/api/billing/balance', route => route.fulfill({ json: { balance: 10000 } }));
    await context.route('https://app.pageview.app/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
    await context.route('**/api/generations', route => { submissions++; return route.fulfill({ status: 500, json: { error: 'unexpected_submission' } }); });
    try {
      await page.goto(`http://localhost:3000/${locale}/create`, { waitUntil: 'domcontentloaded' });
      const controls = page.locator('[data-create-controls]');
      const selects = controls.locator('select');
      const model = selects.nth(0);
      const ratio = selects.nth(1);
      const resolution = selects.nth(2);
      const quality = selects.nth(3);
      const count = selects.nth(4);
      const path = page.getByLabel(locale === 'zh' ? /^路径/ : /^Path/);
      const generate = page.locator(width < 1024 ? '[data-mobile-generate] button' : '[data-create-generate]');
      const checkPrice = async credits => {
        await controls.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
        await generate.waitFor({ state: 'visible' });
        const price = credits == null ? (locale === 'zh' ? '暂无报价' : 'Price unavailable') : `${credits} ${locale === 'zh' ? '积分' : 'credits'}`;
        assert.equal(await generate.innerText(), `${locale === 'zh' ? '生成' : 'Generate'} · ${price}`);
      };
      await checkPrice(3);
      assert.equal(await generate.isDisabled(), true, 'missing prompt does not hide the known default price');
      await page.screenshot({ path: `/tmp/generation-default-credits-${width}-${locale}.png`, animations: 'disabled' });
      await model.selectOption('GPT Image 2');
      await ratio.selectOption('1:1');
      await quality.selectOption('2k');
      await checkPrice(6);
      await count.selectOption('4');
      await checkPrice(24);
      await ratio.selectOption('3:2');
      await checkPrice(24);
      await resolution.selectOption('2k');
      await checkPrice(48);
      await resolution.selectOption('1k');
      await checkPrice(24);
      for (const [value, credits] of [['1k', 8], ['4k', 96]]) {
        await quality.selectOption(value);
        await checkPrice(credits);
      }
      await quality.selectOption('2k');
      await model.selectOption('GPT Image 2.5 Sunburst');
      await checkPrice(24);
      await model.selectOption('GPT Image 2.6 Sunburst');
      await checkPrice(36);
      await model.selectOption('GPT Image 2.6 Flare');
      await checkPrice(20);
      await resolution.selectOption('2k');
      await checkPrice(36);
      await resolution.selectOption('1k');
      await model.selectOption('GPT Image 2');
      await path.selectOption('reference');
      await checkPrice(24);
      assert.equal(await generate.isDisabled(), true, 'missing reference does not hide the quote');
      await model.selectOption('GPT Image 2.5 Flare');
      await ratio.selectOption('1:1');
      await quality.selectOption('1k');
      await count.selectOption('2');
      await checkPrice(4);
      await path.selectOption('edit');
      await checkPrice(4);
      await resolution.selectOption('2k');
      await checkPrice(4);
      await ratio.selectOption('16:9');
      await resolution.selectOption('4k');
      await checkPrice(8);
      await model.selectOption('GPT Image 2.6 Sunburst');
      await quality.selectOption('4k');
      await count.selectOption('4');
      await checkPrice(576);
      await path.selectOption('text');
      await checkPrice(576);
      await model.selectOption('GPT Image 2');
      await ratio.selectOption('3:2');
      await resolution.selectOption('1k');
      await quality.selectOption('2k');
      await count.selectOption('2');
      await checkPrice(12);
      assert.equal(submissions, 0, 'changing controls never submits a generation');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `/tmp/generation-credits-${width}-${locale}.png`, animations: 'disabled' });
      assert.deepEqual(errors, []);
    } finally { await context.close(); await browser.close(); }
  });
}

for (const width of [390, 1440]) {
  test(`resolution/${width}px: ratio shares a row, quality stays independent, legal 4K submits the selected settings`, async () => {
    const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 });
    const page = await context.newPage();
    const errors = [];
    const requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/api/auth/session', route => route.fulfill({ json: { user: { id: 'resolution-test', name: 'Test' }, expires: '2099-01-01T00:00:00Z' } }));
    await context.route('**/api/billing/balance', route => route.fulfill({ json: { balance: 10000 } }));
    await context.route('https://app.pageview.app/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
    await context.route('**/api/generations', route => {
      requests.push(route.request().postDataJSON());
      return route.fulfill({ json: { status: 'running', providerJobId: 'resolution-job' } });
    });
    await context.route('**/api/generations/resolution-job*', route => route.fulfill({ json: { status: 'succeeded', images: ['/__resolution-result.svg'] } }));
    await context.route('**/__resolution-result.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#adc9be"/></svg>' }));
    try {
      await context.addInitScript(() => {
        if (location.origin === 'http://localhost:3000') localStorage.setItem('op_create_history', JSON.stringify([{ id: 'resolution-history', createdAt: 1794000000000, providerJobId: 'saved-job', prompt: 'Saved 2K lake', model: 'GPT Image 2', provider: 'internal', aspectRatio: '16:9', quality: '2k', resolution: '2k', count: 1, images: ['/__resolution-result.svg'] }]));
      });
      await page.goto('http://localhost:3000/zh/create', { waitUntil: 'domcontentloaded' });
      const controls = page.locator('[data-create-controls]');
      const ratio = controls.getByLabel(/^画幅比例/);
      const resolution = controls.getByLabel(/^分辨率/);
      const quality = controls.getByLabel(/^画质/);
      await resolution.waitFor({ timeout: 3000 });
      await controls.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      const [ratioBox, resolutionBox] = await Promise.all([ratio.boundingBox(), resolution.boundingBox()]);
      assert.ok(Math.abs(ratioBox.y - resolutionBox.y) < 1, 'ratio and resolution share a row');
      assert.ok(ratioBox.x + ratioBox.width <= resolutionBox.x, 'ratio and resolution do not overlap');
      if (width < 768) assert.ok(ratioBox.height >= 44 && resolutionBox.height >= 44);
      await controls.locator('select').first().selectOption('GPT Image 2');
      await ratio.selectOption('16:9');
      await quality.selectOption('2k');
      await resolution.selectOption('2k');
      assert.equal(await quality.inputValue(), '2k');
      assert.match(await resolution.locator('option:checked').innerText(), /2048.*1152/);
      await resolution.selectOption('4k');
      assert.equal(await quality.inputValue(), '2k');
      assert.match(await resolution.locator('option:checked').innerText(), /3840.*2160/);
      await page.locator('#op-create-prompt:visible').fill('A watercolor lake');
      const highResolutionGenerate = page.locator(width < 1024 ? '[data-mobile-generate] button' : '[data-create-generate]');
      assert.equal(await highResolutionGenerate.innerText(), '生成 · 24 积分');
      await Promise.all([
        page.waitForResponse(response => response.url().endsWith('/api/generations')),
        highResolutionGenerate.click(),
      ]);
      assert.equal(requests.length, 1);
      assert.equal(requests[0].resolution, '4k');
      assert.equal(requests[0].quality, '2k');
      assert.equal(requests[0].aspectRatio, '16:9');
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('op_create_history') || '[]').some(entry => entry.providerJobId === 'resolution-job' && entry.resolution === '4k'));
      assert.equal(await page.getByRole('dialog').count(), 0);
      await ratio.selectOption('1:1');
      assert.equal(await resolution.inputValue(), '1k', 'incompatible 4K selection resets visibly');
      assert.equal(await resolution.locator('option[value="4k"]').evaluate(option => option.disabled), true);
      await page.locator('[data-create-stage]').getByRole('button', { name: '历史', exact: true }).click();
      const savedCard = page.locator('[data-history-card]').filter({ hasText: 'Saved 2K lake' }).first();
      assert.match(await savedCard.innerText(), /16:9 · 2K/);
      await savedCard.getByRole('button', { name: '复用', exact: true }).click();
      await page.waitForFunction(() => {
        const image = document.querySelector('[data-create-result-grid] img');
        return image?.complete && image.naturalWidth > 0;
      });
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert.equal(await resolution.inputValue(), '2k');
      assert.equal(await ratio.inputValue(), '16:9');
      assert.equal(await quality.inputValue(), '2k');
      await ratio.selectOption('1:1');
      await resolution.selectOption('1k');
      await page.locator('#op-create-prompt').scrollIntoViewIfNeeded();
      const generate = page.locator(width < 1024 ? '[data-mobile-generate] button' : '[data-create-generate]');
      await Promise.all([
        page.waitForResponse(response => response.url().endsWith('/api/generations')),
        generate.click(),
      ]);
      assert.equal(requests.length, 2);
      assert.equal(requests[1].resolution, '1k');
      assert.equal(requests[1].quality, '2k');
      assert.equal(requests[1].aspectRatio, '1:1');
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('op_create_history')).some(entry => entry.providerJobId === 'resolution-job' && entry.resolution === '1k'));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await controls.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await page.screenshot({ path: `/tmp/resolution-controls-${width}.png`, fullPage: false, animations: 'disabled' });
      assert.deepEqual(errors, []);
    } finally { await context.close(); await browser.close(); }
  });
}

test('history retains submitted resolution when controls change during generation', async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  let complete;
  const submitted = new Promise(resolve => { complete = resolve; });
  await page.route('**/api/auth/session', route => route.fulfill({ json: { user: { id: 'resolution-test', name: 'Test' }, expires: '2099-01-01T00:00:00Z' } }));
  await page.route('**/api/billing/balance', route => route.fulfill({ json: { balance: 10000 } }));
  await page.route('https://app.pageview.app/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('**/api/generations', route => complete(route));
  await page.route('**/api/generations/resolution-pending*', route => route.fulfill({ json: { status: 'succeeded', images: ['/__pending-result.svg?image=1', '/__pending-result.svg?image=2', '/__pending-result.svg?image=3', '/__pending-result.svg?image=4'] } }));
  await page.route('**/__pending-result.svg*', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="#adc9be"/></svg>' }));
  try {
    await page.goto('http://localhost:3000/zh/create', { waitUntil: 'domcontentloaded' });
    const controls = page.locator('[data-create-controls]');
    await controls.locator('select').first().selectOption('GPT Image 2');
    await controls.getByLabel(/^画幅比例/).selectOption('1:1');
    await controls.getByLabel(/^画质/).selectOption('2k');
    await controls.getByLabel(/^数量/).selectOption('4');
    await page.locator('#op-create-prompt').fill('Submitted settings');
    await page.locator('[data-create-generate]').click();
    const route = await submitted;
    assert.equal(route.request().postDataJSON().resolution, '1k');
    assert.equal(route.request().postDataJSON().count, 4);
    await controls.getByLabel(/^数量/).selectOption('1');
    await controls.getByLabel(/^分辨率/).selectOption('2k');
    await controls.getByLabel(/^画幅比例/).selectOption('16:9');
    await page.locator('#op-create-prompt').fill('Edited while pending');
    await route.fulfill({ json: { status: 'running', providerJobId: 'resolution-pending' } });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('op_create_history') || '[]').some(entry => entry.providerJobId === 'resolution-pending'));
    const entry = await page.evaluate(() => JSON.parse(localStorage.getItem('op_create_history')).find(entry => entry.providerJobId === 'resolution-pending'));
    assert.equal(entry.resolution, '1k');
    assert.equal(entry.aspectRatio, '1:1');
    assert.equal(entry.prompt, 'Submitted settings');
    assert.equal(entry.count, 4);
    assert.deepEqual(entry.images, ['/__pending-result.svg?image=1', '/__pending-result.svg?image=2', '/__pending-result.svg?image=3', '/__pending-result.svg?image=4']);
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll('[data-create-result-grid] img')];
      return images.length === 4 && images.every(image => image.complete && image.naturalWidth > 0);
    });
    assert.equal(await page.locator('[data-create-result-grid] img').count(), 4);
    await page.screenshot({ path: '/tmp/generation-four-results.png', animations: 'disabled' });
  } finally { await page.close(); await browser.close(); }
});

test('API rejects illegal paths, unknown models, and unavailable models before any charge', async () => {
  const input = { prompt: 'A lake', provider: 'atlascloud', model: 'GPT Image 2', quality: 'low', resolution: '1k', aspectRatio: '1:1', count: 1 };
  for (const path of ['video', 'text', '', null, 1]) {
    const response = await fetch('http://localhost:3000/zh/api/generations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, path }) });
    assert.equal(response.status, 400, `illegal path ${path}`);
    assert.equal((await response.json()).error, 'invalid_path');
  }
  for (const [model, error] of [['GPT Image 20', 'unpriced'], ['Unknown', 'unpriced'], ['Nano Banana 2', 'model_coming_soon']]) {
    const response = await fetch('http://localhost:3000/zh/api/generations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, model }) });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, error);
  }
});

test('API recomputes same-price modes at reference limits and ignores client-supplied credits', async () => {
  for (const [model, max, credits] of [['GPT Image 2', 10, 384], ['GPT Image 2.5 Sunburst', 16, 384], ['GPT Image 2.5 Flare', 16, 192], ['GPT Image 2.6 Sunburst', 16, 576], ['GPT Image 2.6 Flare', 16, 288]]) {
    const input = { prompt: 'A lake', provider: 'atlascloud', model, quality: 'high', resolution: '4k', aspectRatio: '16:9', count: 4, credits: 0 };
    for (const path of ['text-to-image', 'reference', 'edit']) {
      for (const referenceCount of path === 'text-to-image' ? [0] : [1, max]) {
        const response = await fetch('http://localhost:3000/zh/api/generations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, path, referenceImages: Array(referenceCount).fill('/reference.png') }) });
        assert.equal(response.status, 402, 'no identity means no debit or provider request');
        assert.deepEqual(await response.json(), { error: 'no_identity', credits, pricing: false });
      }
      if (path !== 'text-to-image') {
        for (const [referenceCount, error] of [[0, 'missing_reference'], [max + 1, 'too_many_reference_images']]) {
          const response = await fetch('http://localhost:3000/zh/api/generations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, path, referenceImages: Array(referenceCount).fill('/reference.png') }) });
          assert.equal(response.status, 400);
          assert.equal((await response.json()).error, error);
        }
      }
    }
  }
});

test('API rejects malformed counts before billing and preserves valid count quotes', async () => {
  const input = { prompt: 'A lake', provider: 'atlascloud', model: 'GPT Image 2', quality: 'medium', resolution: '1k', aspectRatio: '1:1' };
  for (const count of [0, -1, 1.5, 5, 11, null, '2', true]) {
    const response = await fetch('http://localhost:3000/zh/api/generations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, count }) });
    assert.equal(response.status, 400, `count ${count}`);
    assert.equal((await response.json()).error, 'invalid_count');
  }
  for (const [count, credits] of [[undefined, 6], [1, 6], [2, 12], [3, 18], [4, 24]]) {
    const response = await fetch('http://localhost:3000/zh/api/generations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, count }) });
    assert.equal(response.status, 402, 'anonymous requests cannot charge or call the provider');
    const rejected = await response.json();
    assert.equal(rejected.error, 'no_identity');
    assert.equal(rejected.credits, credits);
  }
});

test('API rejects malformed resolution and unsupported 4K before billing', async () => {
  for (const [resolution, aspectRatio] of [['8k', '16:9'], ['4k', '1:1'], ['2k', 'bad'], [{ value: '2k' }, '16:9'], [null, '1:1'], ['1k', 'constructor'], ['2k', '__proto__'], ['1k', null], ['1k', ['16:9']]]) {
    const response = await fetch('http://localhost:3000/zh/api/generations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'A lake', model: 'GPT Image 2', quality: '2k', resolution, aspectRatio, count: 1 }) });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error, 'unsupported_size');
  }
  for (const [resolution, aspectRatio, credits] of [['2k', '1:1', 12], ['4k', '16:9', 24], ['4k', '9:16', 24]]) {
    const response = await fetch('http://localhost:3000/zh/api/generations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: 'A lake', provider: 'atlascloud', model: 'GPT Image 2', quality: '2k', resolution, aspectRatio, count: 1 }) });
    assert.equal(response.status, 402);
    assert.deepEqual(await response.json(), { error: 'no_identity', credits, pricing: false });
  }
});
