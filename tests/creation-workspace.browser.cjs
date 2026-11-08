const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const emptyText = '还没有生成结果。写好提示词后点击「生成」，图片会出现在这里。';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

async function withPage(width, run, locale = 'zh', height = 844) {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.route('**/api/auth/session', route => route.fulfill({ json: {} }));
  await page.route('**/api/billing/balance', route => route.fulfill({ json: { balance: 10000 } }));
  await page.route('https://app.pageview.app/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('https://pbs.twimg.com/**', route => route.fulfill({ contentType: 'image/png', body: png }));
  await page.route('https://uploads.example.test/**', route => route.fulfill({ contentType: 'image/png', body: png }));
  try {
    const response = await page.goto(`http://localhost:3000/${locale}/create`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    await page.locator('#op-create-prompt').waitFor();
    await run(page);
    assert.deepEqual(errors, [], 'no uncaught browser or console errors');
  } finally {
    await context.close();
    await browser.close();
  }
}

for (const width of [390, 1440]) {
  test(`${width}px: latest inspiration restores real demo images, prompts and references without submission`, async () => {
    await withPage(width, async page => {
      const paid = [];
      await page.route('**/api/generations**', route => { paid.push(route.request().method()); return route.abort(); });
      await page.locator('main select').first().selectOption('reference');
      const inspiration = page.locator('[data-create-inspiration]');
      await inspiration.scrollIntoViewIfNeeded();
      const cards = inspiration.locator('[data-inspiration-template]');
      assert.deepEqual(await cards.evaluateAll(elements => elements.map(element => element.dataset.inspirationTemplate)), [
        'watercolor-photo-vignette-76967165', 'countryside-film-collage-2a70f109', 'hand-drawn-travel-journal-57d01f1b', 'travel-field-notes-458ca2b0', 'gpt-image-2-on-chatgpt-f7a4c7af', 'custom-minifigure-set-16b6425d',
      ]);
      for (const [id, src, ratio, quality, count, length, size] of [
        ['countryside-film-collage-2a70f109', '/creation-results/site-countryside-collage.png', '4:5', '1k', 1, 1680, [1087, 1446]],
        ['gpt-image-2-on-chatgpt-f7a4c7af', '/creation-results/site-cola-poster-1.png', '2:3', '2k', 2, 853, [1448, 1086]],
      ]) {
        const card = inspiration.locator(`[data-inspiration-template="${id}"]`);
        await card.scrollIntoViewIfNeeded();
        assert.equal(await card.locator('img').evaluate(img => new URL(img.src).searchParams.get('url') ?? img.getAttribute('src')), src);
        await card.click();
        await page.waitForFunction(expected => document.querySelector('#op-create-prompt')?.value.length === expected, length);
        await page.locator('[data-reference-status="selected"]').waitFor();
        assert.equal(new URL(page.url()).searchParams.get('demo'), 'site');
        assert.equal(new URL(page.url()).searchParams.get('template'), id);
        const expectedSettings = ['reference', 'GPT Image 2', ratio, '1k', quality, String(count)];
        await page.waitForFunction(expected => JSON.stringify(Array.from(document.querySelectorAll('main select'), element => element.value)) === JSON.stringify(expected), expectedSettings);
        assert.deepEqual(await page.locator('main select').evaluateAll(elements => elements.map(element => element.value)), expectedSettings);
        const preview = page.locator('[data-reference-preview] img');
        await preview.evaluate(img => img.decode());
        assert.deepEqual(await preview.evaluate(img => [img.naturalWidth, img.naturalHeight]), size);
        assert.equal(await preview.count(), 1);
      }
      await cards.first().click();
      await page.waitForFunction(() => document.querySelectorAll('[data-reference-status]').length === 0);
      assert.equal(new URL(page.url()).searchParams.get('template'), 'watercolor-photo-vignette-76967165');
      assert.equal(new URL(page.url()).searchParams.has('demo'), false, 'ordinary Hero selection clears the previous demo context');
      assert.ok((await page.locator('#op-create-prompt').inputValue()).trim().length > 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await inspiration.scrollIntoViewIfNeeded();
      await inspiration.screenshot({ path: `/tmp/op-mobile/${width}_latest-reference-inspiration.png` });
      assert.deepEqual(paid, []);
    });
  });
}

for (const width of [320, 390, 1440]) {
  test(`${width}px: roomy result canvas precedes curated mode-matched, usable inspirations`, async () => {
    await withPage(width, async page => {
      const stage = page.locator('[data-create-stage]');
      const empty = stage.getByText(emptyText, { exact: true }).locator('..');
      await empty.waitFor({state:'visible'});
      const emptyHeight = (await empty.boundingBox()).height;
      assert.ok(emptyHeight >= 200 && emptyHeight <= 300, 'the result area leaves inspiration close by rather than a large empty gap');
      const inspiration = page.locator('[data-create-inspiration]');
      const modeSelect = page.getByRole('main').locator('select').first();
      const idsByMode = [];
      const uploads = [];
      await page.route('**/api/generations/upload', route => {
        uploads.push(route.request().url());
        return route.fulfill({ json: { url: 'https://uploads.example.test/inspiration.png' } });
      });
      for (const mode of ['text', 'reference', 'edit']) {
        await modeSelect.selectOption(mode);
        await page.waitForFunction(expected => document.querySelector('[data-create-inspiration]')?.getAttribute('data-mode') === expected, mode);
        const cards = inspiration.locator('[data-inspiration-template]');
        const expectedCount = { text: 7, reference: 6, edit: 2 }[mode];
        assert.equal(await cards.count(), expectedCount, 'only available curated landing examples are shown');
        const ids = await cards.evaluateAll(elements => elements.map(element => element.getAttribute('data-inspiration-template')));
        assert.equal(new Set(ids).size, expectedCount);
        idsByMode.push(ids);
        if (mode === 'reference') {
          await page.locator('input[type=file]').setInputFiles({ name: 'inspiration.png', mimeType: 'image/png', buffer: png });
          await page.waitForFunction(() => document.querySelector('[data-reference-status="selected"]'));
          assert.match(await page.locator('[data-reference-preview] img').getAttribute('src'), /^blob:/, 'inspiration keeps the reference preview local');
        }
        const selectedCard = mode === 'reference' ? cards.nth(1) : cards.first();
        await selectedCard.click();
        const selectedPrompt = await page.locator('#op-create-prompt').inputValue();
        assert.ok(selectedPrompt.trim().length > 0, 'inspiration fills the generator prompt');
        assert.equal(await modeSelect.inputValue(), mode, 'inspiration does not switch the selected creation mode');
        await page.locator('#op-create-prompt').fill('A user-modified prompt');
        await selectedCard.click();
        assert.equal(await page.locator('#op-create-prompt').inputValue(), selectedPrompt, 'the same inspiration can be reapplied after editing');
        if (mode !== 'text') {
          await page.waitForFunction(expected => document.querySelectorAll('[data-reference-status="selected"]').length === expected, mode === 'reference' ? 2 : 1);
          assert.equal(await page.locator('[data-reference-preview] img[alt="inspiration.png"]').count(), 1, 'the manual reference remains when a demo is applied or its context ends');
        }
        const [stageBox, inspirationBox] = await Promise.all([stage.boundingBox(), inspiration.boundingBox()]);
        assert.ok(inspirationBox.y >= stageBox.y && inspirationBox.y + inspirationBox.height <= stageBox.y + stageBox.height + 1, 'inspiration stays at the bottom inside the result panel');
        if (width >= 1024) {
          assert.ok(inspirationBox.y + inspirationBox.height <= 844, `desktop inspiration is visible without scrolling past the workspace: ${JSON.stringify({ mode, stageBox, inspirationBox })}`);
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'no horizontal overflow');
        await inspiration.screenshot({ path: `/tmp/op-mobile/${width}_${mode}_inspiration.png`, animations: 'disabled' });
      }
      for (let i = 0; i < idsByMode.length; i++) {
        for (let j = i + 1; j < idsByMode.length; j++) {
          assert.equal(idsByMode[i].filter(id => idsByMode[j].includes(id)).length, 0, 'different creation modes do not share mismatched recommendations');
        }
      }
      assert.deepEqual(uploads, [], 'selecting references and applying inspirations never uploads without submission');
      await stage.screenshot({ path: `/tmp/op-mobile/${width}_empty-result-canvas.png`, animations: 'disabled' });
    });
  });
}

for (const width of [390, 1440]) {
  for (const count of [1, 4]) {
    test(`${width}px: ${count} generated images fit the canvas, preview, download and persist in history`, async () => {
      await withPage(width, async page => {
        const imageSizes = [[800, 1200], [1200, 800], [1200, 600], [960, 960]];
        await page.route('**/__test-results/*.svg', route => {
          const index = Number(new URL(route.request().url()).pathname.match(/(\d+)\.svg$/)[1]) - 1;
          const [w, h] = imageSizes[index];
          return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="${['#bacdbc', '#dfc0a1', '#aebfce', '#d0bacb'][index]}"/><circle cx="${w / 2}" cy="${h / 2}" r="${Math.min(w, h) / 4}" fill="#ffffff" fill-opacity=".6"/></svg>` });
        });
        let submit;
        let requestBody;
        const submitted = new Promise(resolve => { submit = resolve; });
        await page.route('**/api/generations', route => {
          requestBody = route.request().postDataJSON();
          submit(route);
        });
        const images = Array.from({ length: count }, (_, i) => `/__test-results/${i + 1}.svg`);
        await page.route('**/api/generations/canvas-test*', route => route.fulfill({ json: { status: 'succeeded', images } }));
        const controls = page.getByRole('main').locator('[data-create-controls] select');
        await controls.nth(0).selectOption('GPT Image 2');
        await controls.nth(1).selectOption('1:1');
        await controls.nth(3).selectOption('2k');
        await controls.nth(4).selectOption(String(count));
        await page.locator('#op-create-prompt').fill('Create a colorful abstract composition');
        await page.locator(width < 1024 ? '[data-mobile-generate] button' : '[data-create-generate]').click();
        await page.getByRole('dialog').getByRole('button', { name: '继续匿名购买', exact: true }).click();
        const route = await submitted;
        const stage = page.locator('[data-create-stage]');
        const grid = stage.locator('[data-create-result-grid]');
        assert.equal(await grid.locator(':scope > div').count(), count, 'loading placeholders match the requested image count');
        assert.ok((await grid.boundingBox()).height >= 200 && (await grid.boundingBox()).height <= 300);
        const inspirationButtons = page.locator('[data-create-inspiration] [data-inspiration-template]');
        assert.equal(await inspirationButtons.first().isDisabled(), true, 'inspiration cannot replace a running generation');
        await route.fulfill({ json: { status: 'running', providerJobId: 'canvas-test', generationId: 'canvas-generation-test' } });
        await page.waitForFunction(expected => {
          const imgs = document.querySelectorAll('[data-create-result-grid] img');
          return imgs.length === expected && Array.from(imgs).every(img => img.complete && img.naturalWidth > 0);
        }, count);
        const tiles = grid.locator(':scope > div');
        assert.equal(await tiles.count(), count);
        assert.equal(requestBody.count, count);
        assert.equal(requestBody.path, 'text-to-image');
        const { boxes, gridBox } = await grid.evaluate(element => ({
          boxes: Array.from(element.children, tile => {
            const { x, y, width, height } = tile.getBoundingClientRect();
            return { x, y, width, height };
          }),
          gridBox: (() => {
            const { x, y, width, height } = element.getBoundingClientRect();
            return { x, y, width, height };
          })(),
        }));
        if (count === 4) {
          assert.ok(Math.abs(boxes[0].y - boxes[1].y) < 1, 'first pair shares a row');
          assert.ok(Math.abs(boxes[2].y - boxes[3].y) < 1, 'second pair shares a row');
          assert.ok(boxes[2].y >= boxes[0].y + boxes[0].height, 'second pair follows the first without overlap');
        }
        for (const box of boxes) {
          assert.ok(box.height > 100 && box.width > 100, 'generated artwork is not a thumbnail');
          assert.ok(box.y + box.height <= gridBox.y + gridBox.height + 1, 'every image fits inside the reserved result area');
        }
        assert.ok(await grid.locator('img').evaluateAll(imgs => imgs.every(img => getComputedStyle(img).objectFit === 'contain')), 'artwork is not cropped');
        await page.waitForFunction(expected => JSON.parse(localStorage.getItem('op_create_history') || '[]').some(entry => entry.images.length === expected), count);
        await stage.screenshot({ path: `/tmp/op-mobile/${width}_${count}_generated-canvas.png`, animations: 'disabled' });
        await tiles.first().getByRole('button', { name: '全屏查看', exact: true }).last().click();
        await page.getByRole('dialog').waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        const download = page.waitForEvent('download');
        await tiles.first().getByRole('button', { name: '下载', exact: true }).click();
        assert.ok((await download).suggestedFilename().length > 0);
        await stage.getByRole('button', { name: '历史', exact: true }).click();
        assert.ok(await stage.getByText('Create a colorful abstract composition', { exact: true }).isVisible());
        await stage.getByRole('button', { name: '当前', exact: true }).click();
        assert.equal(await grid.locator('img').count(), count);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      });
    });
  }
}

test('short desktop: history hides inspiration and current restores it on screen', async () => {
  await withPage(1440, async page => {
    const stage = page.locator('[data-create-stage]');
    const inspiration = stage.locator('[data-create-inspiration]');
    for (const tab of ['当前', '历史', '当前']) {
      await stage.getByRole('button', { name: tab, exact: true }).click();
      if (tab === '历史') {
        assert.equal(await inspiration.count(), 0, 'history dedicates its panel to saved images');
      } else {
        const box = await inspiration.boundingBox();
        assert.ok(box.y >= 64 && box.y + box.height <= 600, `current inspiration fits a short desktop window: ${JSON.stringify(box)}`);
      }
    }
    await stage.screenshot({ path: '/tmp/op-mobile/1440_short-result-canvas.png', animations: 'disabled' });
  }, 'zh', 600);
});

for (const width of [390, 1440]) {
  test(`${width}px: inspiration shows whole images and is not obscured by the generate button`, async () => {
    await withPage(width, async page => {
      const stage = page.locator('[data-create-stage]');
      await stage.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
      const inspiration = stage.locator('[data-create-inspiration]');
      for (const card of await inspiration.locator('[data-inspiration-template]').all()) {
        await card.scrollIntoViewIfNeeded();
        await card.locator('img').evaluate(image => image.decode());
      }
      await inspiration.locator('[data-inspiration-template]').first().scrollIntoViewIfNeeded();
      await page.waitForFunction(() => {
        const images = document.querySelectorAll('[data-create-inspiration] img');
        return images.length === 7 && Array.from(images).every(image => image.complete && image.naturalWidth > 0);
      });
      assert.ok(await inspiration.locator('img').evaluateAll(images => images.every(image => getComputedStyle(image).objectFit === 'contain')), 'selected images retain their proportions without cropping');
      await page.waitForFunction(() => {
        const visibleCards = Array.from(document.querySelectorAll('[data-inspiration-template]')).filter(card => {
          const box = card.getBoundingClientRect();
          return box.x >= 0 && box.right <= innerWidth;
        });
        return visibleCards.length > 0 && visibleCards.every(card => {
          const box = card.getBoundingClientRect();
          const hit = document.elementFromPoint(box.x + box.width / 2, box.bottom - 8);
          return hit && card.contains(hit);
        });
      });
      await stage.screenshot({ path: `/tmp/op-mobile/${width}_visible-inspiration-canvas.png`, animations: 'disabled' });
    });
  });
}

for (const width of [390, 1440]) {
  test(`${width}px: large equal-height artworks follow native proportions without side gaps`, async () => {
    await withPage(width, async page => {
      const dimensions = new Map();
      await page.route('https://pbs.twimg.com/**', route => {
        const path = new URL(route.request().url()).pathname;
        if (!dimensions.has(path)) dimensions.set(path, dimensions.size % 2 ? [1200, 800] : [600, 900]);
        const [w, h] = dimensions.get(path);
        return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#aec9bb"/></svg>` });
      });
      await page.reload({ waitUntil: 'load' });
      const inspiration = page.locator('[data-create-inspiration]');
      await inspiration.scrollIntoViewIfNeeded();
      for (const card of await inspiration.locator('[data-inspiration-template]').all()) {
        await card.scrollIntoViewIfNeeded();
        await card.locator('img').evaluate(image => image.decode());
      }
      await page.waitForFunction(() => {
        const images = document.querySelectorAll('[data-create-inspiration] img');
        return images.length === 7 && Array.from(images).every(image => image.complete && image.naturalWidth > 0);
      });
      const artwork = await inspiration.locator('img').evaluateAll(images => images.map(image => {
        const box = image.parentElement.getBoundingClientRect();
        return { width: box.width, height: box.height, nativeRatio: image.naturalWidth / image.naturalHeight };
      }));
      for (const image of artwork) {
        assert.ok(image.height >= (width < 1024 ? 180 : 220), 'inspiration uses exhibition-size artwork rather than small thumbnails');
        assert.ok(Math.abs(image.width / image.height - image.nativeRatio) < 0.02, 'the artwork frame matches its native ratio with no letterboxing');
        assert.ok(Math.abs(image.height - artwork[0].height) < 1, 'every artwork uses the same display height');
      }
      assert.ok(new Set(artwork.map(image => Math.round(image.width))).size > 1, 'landscape and portrait artworks have different widths');
      const last = inspiration.locator('[data-inspiration-template]').last();
      await last.evaluate(element => element.scrollIntoView({ block: 'nearest', inline: 'end', behavior: 'instant' }));
      await last.click();
      assert.ok((await page.locator('#op-create-prompt').inputValue()).trim().length > 0, 'off-screen artworks remain reachable and usable');
      if (width < 1024) await page.locator('[data-mobile-generate] button').waitFor({ state: 'visible' });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'horizontal scrolling stays inside the artwork strip');
    });
  });
}

test('unavailable artwork is removed from inspiration without substituting a different creation mode', async () => {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  const page = await browser.newPage({ viewport: { width: 1440, height: 844 } });
  const errors = [];
  let failedUrl;
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/auth/session', route => route.fulfill({ json: {} }));
  await page.route('**/api/billing/balance', route => route.fulfill({ json: { balance: 10000 } }));
  await page.route('https://app.pageview.app/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('https://pbs.twimg.com/**', route => {
    if (!failedUrl || route.request().url() === failedUrl) {
      failedUrl = route.request().url();
      return route.fulfill({ status: 403, body: '' });
    }
    return route.fulfill({ contentType: 'image/png', body: png });
  });
  try {
    await page.goto('http://localhost:3000/zh/create', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('[data-create-inspiration] [data-inspiration-template]');
      return cards.length === 6 && Array.from(cards).every(card => card.querySelector('img')?.naturalWidth > 0);
    });
    assert.ok(failedUrl);
    const inspiration = page.locator('[data-create-inspiration]');
    assert.equal(await inspiration.getAttribute('data-mode'), 'text');
    assert.ok(await inspiration.locator('img').evaluateAll((images, failed) => images.every(img => img.src !== failed), failedUrl));
    assert.equal(await inspiration.getByText('封面加载失败', { exact: true }).count(), 0);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

for (const [locale, title] of [['ja', '厳選インスピレーション'], ['fr', 'Inspirations sélectionnées']]) {
  test(`${locale}: inspiration controls are localized and follow the creation mode`, async () => {
    await withPage(390, async page => {
      const inspiration = page.locator('[data-create-inspiration]');
      await inspiration.getByRole('heading', { name: title, exact: true }).waitFor();
      const mode = page.getByRole('main').locator('select').first();
      await mode.selectOption('edit');
      await page.waitForFunction(() => document.querySelector('[data-create-inspiration]')?.getAttribute('data-mode') === 'edit');
      assert.equal(await inspiration.locator('[data-inspiration-template]').count(), 2);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), 390);
    }, locale);
  });
}
