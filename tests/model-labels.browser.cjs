const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

for (const { locale, width, detailed, fast, soon } of [
  { locale: 'zh', width: 320, detailed: '精细版', fast: '快速版', soon: '即将上线' },
  { locale: 'ja', width: 390, detailed: '高精細', fast: '高速', soon: '近日公開' },
  { locale: 'fr', width: 1440, detailed: 'Détaillé', fast: 'Rapide', soon: 'À venir' },
]) {
  test(`${locale}/${width}px: localized model labels keep selection values`, async () => {
    const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 768, hasTouch: width < 768 });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.route('**/api/auth/session', route => route.fulfill({ json: {} }));
    await page.route('**/api/billing/balance', route => route.fulfill({ json: { balance: 10000 } }));
    await page.route('https://app.pageview.app/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
    try {
      await page.goto(`http://localhost:3000/${locale}/create`, { waitUntil: 'domcontentloaded' });
      const select = page.getByRole('main').locator('select:has(option[value="GPT Image 2.6 Flare"])');
      await select.waitFor();
      assert.deepEqual(await select.locator('option').evaluateAll(options => options.map(option => ({ label: option.textContent, value: option.value }))), [
        { label: `GPT Image 2.6 · ${detailed}`, value: 'GPT Image 2.6 Sunburst' },
        { label: `GPT Image 2.6 · ${fast}`, value: 'GPT Image 2.6 Flare' },
        { label: `GPT Image 2.5 · ${detailed}`, value: 'GPT Image 2.5 Sunburst' },
        { label: `GPT Image 2.5 · ${fast}`, value: 'GPT Image 2.5 Flare' },
        { label: 'GPT Image 2', value: 'GPT Image 2' },
        { label: `Nano Banana 2 · ${soon}`, value: 'Nano Banana 2' },
      ]);
      assert.equal(await select.locator('option[value="Nano Banana 2"]').evaluate(option => option.disabled), true, 'coming-soon models cannot be selected');
      assert.equal(await select.inputValue(), 'GPT Image 2.6 Sunburst', 'latest detailed model is selected by default');
      await select.selectOption('GPT Image 2');
      await select.focus();
      await page.keyboard.press('ArrowDown');
      assert.equal(await select.inputValue(), 'GPT Image 2', 'native keyboard selection skips the coming-soon option');
      await select.selectOption('GPT Image 2.6 Sunburst');
      if (locale === 'ja') {
        const text = await page.getByRole('main').locator('[data-create-controls]').innerText();
        assert.match(text, /モデル/);
        assert.doesNotMatch(text, /精细版|快速版|模型|默认/);
      }
      const controls = page.getByRole('main').locator('[data-create-controls]');
      const quality = controls.locator('select').nth(3);
      const labels = { zh: ['低', '中', '高'], ja: ['低', '中', '高'], fr: ['Faible', 'Moyenne', 'Élevée'] }[locale];
      assert.deepEqual(await quality.locator('option').evaluateAll(options => options.map(option => option.value)), ['1k', '2k', '4k']);
      const qualityTexts = await quality.locator('option').allTextContents();
      assert.ok(qualityTexts.every((text, i) => text.startsWith(labels[i]) && !/[124]k/i.test(text)), 'quality levels are not labeled as image resolutions');
      const quantity = controls.locator('select').nth(4);
      await controls.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      const [qualityBox, quantityBox] = await Promise.all([quality.boundingBox(), quantity.boundingBox()]);
      assert.ok(Math.abs(qualityBox.y - quantityBox.y) < 1, 'quality and quantity share one row');
      assert.ok(qualityBox.x + qualityBox.width <= quantityBox.x, 'controls do not overlap');
      for (const control of [quality, quantity]) {
        assert.ok(await control.evaluate(element => {
          const rect = element.getBoundingClientRect();
          return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === element;
        }), 'control can be reached without a floating overlay');
      }
      if (width < 768) {
        assert.ok(qualityBox.height >= 44 && quantityBox.height >= 44, 'mobile controls retain touch target height');
      }
      await quantity.selectOption('4');
      await quality.selectOption('4k');
      assert.equal(await quantity.inputValue(), '4');
      assert.equal(await quality.inputValue(), '4k');
      await quantity.selectOption('1');
      await quality.selectOption('1k');
      await select.selectOption({ label: `GPT Image 2.6 · ${fast}` });
      assert.equal(await select.inputValue(), 'GPT Image 2.6 Flare');
      await select.selectOption({ label: `GPT Image 2.5 · ${detailed}` });
      assert.equal(await select.inputValue(), 'GPT Image 2.5 Sunburst');
      await select.selectOption('GPT Image 2.6 Sunburst');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'no horizontal overflow');
      await page.getByRole('main').locator('[data-create-controls]').screenshot({ path: `/tmp/op-mobile/${locale}_${width}_model-labels.png`, animations: 'disabled' });
      assert.deepEqual(errors, [], 'no uncaught browser errors');
    } finally {
      await context.close();
      await browser.close();
    }
  });
}

for (const mode of ['reference', 'edit']) {
  test(`${mode}: localized fast variant submits the original model identifier`, async () => {
    const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.route('**/api/auth/session', route => route.fulfill({ json: {} }));
    await page.route('**/api/billing/balance', route => route.fulfill({ json: { balance: 10000 } }));
    const uploads = [];
    await page.route('**/api/generations/upload', route => {
      uploads.push(route.request().url());
      return route.fulfill({ json: { url: 'https://uploads.example.test/model.png' } });
    });
    let requestBody;
    await page.route('**/api/generations', route => {
      requestBody = route.request().postDataJSON();
      return route.fulfill({ json: { status: 'failed' } });
    });
    try {
      await page.goto(`http://localhost:3000/zh/create?mode=${mode}`, { waitUntil: 'domcontentloaded' });
      const select = page.getByRole('main').locator('select:has(option[value="GPT Image 2.5 Flare"])');
      await select.waitFor();
      await select.selectOption({ label: 'GPT Image 2.5 · 快速版' });
      await page.locator('input[type=file]').setInputFiles({
        name: 'model.png',
        mimeType: 'image/png',
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'),
      });
      await page.waitForFunction(() => document.querySelector('[data-reference-status="selected"]'));
      assert.match(await page.locator('[data-reference-preview] img').getAttribute('src'), /^blob:/, 'selection creates a local preview');
      assert.deepEqual(uploads, [], 'selection does not upload');
      await page.locator('#op-create-prompt').fill('Change the reference to a watercolor painting');
      const controls = page.getByRole('main').locator('[data-create-controls] select');
      await controls.nth(1).selectOption('1:1');
      await controls.nth(3).selectOption('1k');
      await controls.nth(4).selectOption('1');
      const generated = page.waitForResponse(response => response.url().endsWith('/api/generations'), { timeout: 5000 });
      await page.locator('[data-mobile-generate] button').click();
      await page.getByRole('dialog').waitFor();
      assert.deepEqual(uploads, [], 'Generate does not upload before anonymous confirmation');
      await page.getByRole('dialog').getByRole('button', { name: '继续匿名购买', exact: true }).click();
      await generated;
      assert.equal(uploads.length, 1, 'confirmation uploads the selected file');
      assert.equal(requestBody.model, 'GPT Image 2.5 Flare');
      assert.equal(requestBody.path, mode);
      assert.equal(requestBody.quality, '1k');
      assert.equal(requestBody.aspectRatio, '1:1');
      assert.equal(requestBody.count, 1);
      assert.deepEqual(requestBody.referenceImages, ['https://uploads.example.test/model.png']);
    } finally {
      await page.close();
      await browser.close();
    }
  });
}
