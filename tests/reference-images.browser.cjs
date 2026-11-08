const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
const file = name => ({ name, mimeType: 'image/png', buffer: png });

async function withPage(width, run) {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 768, hasTouch: width < 768 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.uploadPreviews = { created: [], revoked: [] };
    const create = URL.createObjectURL.bind(URL);
    const revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => {
      const url = create(blob);
      window.uploadPreviews.created.push(url);
      return url;
    };
    URL.revokeObjectURL = url => {
      window.uploadPreviews.revoked.push(url);
      revoke(url);
    };
  });
  await page.route('**/api/auth/session', route => route.fulfill({ json: {} }));
  await page.route('**/api/billing/balance', route => route.fulfill({ json: { balance: 10000 } }));
  try {
    await page.goto('http://localhost:3000/zh/create?mode=reference', { waitUntil: 'domcontentloaded' });
    await page.locator('input[type=file]').waitFor({ state: 'attached' });
    await run(page);
    assert.deepEqual(errors, [], 'no uncaught browser errors');
  } finally {
    await context.close();
    await browser.close();
  }
}

for (const width of [390, 1440]) {
  for (const [id, ratio, quality, count, length, inputSize] of [
    ['countryside-film-collage-2a70f109', '4:5', '1k', 1, 1680, [1087, 1446]],
    ['gpt-image-2-on-chatgpt-f7a4c7af', '2:3', '2k', 2, 853, [1448, 1086]],
  ]) {
    test(`${width}px: site demo ${id} restores genuine local reference and settings without uploading`, async () => {
      await withPage(width, async page => {
        const paid = [];
        await page.route('**/api/generations**', route => { paid.push(route.request().method()); return route.abort(); });
        await page.goto('http://localhost:3000/zh/reference-to-image', { waitUntil: 'domcontentloaded' });
        const article = page.locator('.op-ctype-case').filter({ has: page.locator(`a[href*="template=${id}"]`) });
        await article.scrollIntoViewIfNeeded();
        assert.doesNotMatch(await article.innerText(), /本站实测|参考图来自作品库|查看参考作品|OpenPrompts\./);
        assert.equal(await article.locator('.op-artwork-notice').count(), 0, 'site demo source and settings lines are omitted');
        const inputs = article.locator('[data-group="inputs"] img');
        const outputs = article.locator('[data-group="outputs"] img');
        assert.equal(await inputs.count(), 1);
        assert.equal(await outputs.count(), count);
        for (const image of [...await inputs.all(), ...await outputs.all()]) await image.evaluate(img => img.decode());
        const displayedPrompt = await article.locator('details p').textContent();
        assert.equal(displayedPrompt.length, length);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
        await article.screenshot({ path: `/tmp/op-mobile/${width}_${id}_site-demo.png` });
        await article.locator('[data-group="outputs"] button').first().click();
        const viewer = page.getByRole('dialog');
        await viewer.waitFor();
        if (count === 2) {
          await viewer.getByRole('button', { name: /下一张/ }).click();
          await page.waitForFunction(() => document.querySelector('[role=dialog] .op-viewer-counter')?.textContent === '2 / 2');
        }
        await page.keyboard.press('Escape');
        await viewer.waitFor({ state: 'detached' });
        await article.locator('a[href*="demo=site"]').click();
        await page.locator('[data-reference-status="selected"]').waitFor();
        await page.waitForFunction(expected => document.querySelector('#op-create-prompt')?.value === expected, displayedPrompt);
        assert.equal(await page.locator('#op-create-prompt').inputValue(), displayedPrompt);
        assert.deepEqual(await page.locator('main select').evaluateAll(elements => elements.map(e => e.value)), ['reference', 'GPT Image 2', ratio, '1k', quality, String(count)]);
        const preview = page.locator('[data-reference-preview] img');
        await preview.evaluate(img => img.decode());
        assert.deepEqual(await preview.evaluate(img => [img.naturalWidth, img.naturalHeight]), inputSize);
        assert.match(await preview.getAttribute('src'), /^blob:/);
        assert.equal(await page.locator('[data-create-generate]').isEnabled(), true);
        assert.match(await page.locator('[data-create-generate]').textContent(), new RegExp(count === 1 ? '2 积分' : '12 积分'));
        await page.locator('[data-reference-images]').screenshot({ path: `/tmp/op-mobile/${width}_${id}_restored-reference.png` });
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.locator('[data-reference-status="selected"]').waitFor();
        await page.waitForFunction(expected => document.querySelector('#op-create-prompt')?.value === expected, displayedPrompt);
        assert.equal(await page.locator('#op-create-prompt').inputValue(), displayedPrompt);
        await page.goto(`http://localhost:3000/zh/create?mode=reference&template=${id}`, { waitUntil: 'domcontentloaded' });
        await page.locator('#op-create-prompt').waitFor();
        assert.equal(await page.locator('[data-reference-status]').count(), 0, 'ordinary template never auto-selects a demo reference');
        await page.goto('http://localhost:3000/zh/create?mode=reference&template=unknown&demo=site&reference=https://untrusted.test/photo.png', { waitUntil: 'domcontentloaded' });
        await page.locator('#op-create-prompt').waitFor();
        assert.equal(await page.locator('[data-reference-status]').count(), 0);
        assert.deepEqual(paid, [], 'navigation, previews and reload never upload or generate');
      });
    });
  }
}

test('leaving reference mode cancels a pending automatic site-demo reference', async () => {
  await withPage(1440, async page => {
    const paid = [];
    await page.route('**/api/generations**', route => { paid.push(route.request().method()); return route.abort(); });
    let release;
    let started;
    const pending = new Promise(resolve => { release = resolve; });
    const requested = new Promise(resolve => { started = resolve; });
    await page.route('**/creation-references/site-cola-product.jpg', async route => {
      const response = await route.fetch();
      started();
      await pending;
      await route.fulfill({ response });
    });
    await page.goto('http://localhost:3000/zh/create?mode=reference&template=gpt-image-2-on-chatgpt-f7a4c7af&demo=site', { waitUntil: 'domcontentloaded' });
    await requested;
    await page.locator('main select').first().selectOption('edit');
    const restored = page.waitForFunction(() => document.querySelectorAll('[data-reference-status]').length > 0, undefined, { timeout: 1200 }).then(() => true, () => false);
    release();
    assert.equal(await restored, false, 'a reference selected in the old mode must not arrive in Image Edit');
    assert.equal(await page.locator('main select').first().inputValue(), 'edit');
    assert.deepEqual(paid, []);
  });
});

test('invalidating site-demo context closes its reference viewer and preserves manual references', async () => {
  await withPage(1440, async page => {
    const paid = [];
    await page.route('**/api/generations**', route => { paid.push(route.request().method()); return route.abort(); });
    await page.goto('http://localhost:3000/zh/create?mode=reference&template=gpt-image-2-on-chatgpt-f7a4c7af&demo=site', { waitUntil: 'domcontentloaded' });
    await page.locator('[data-reference-status="selected"]').waitFor();
    await page.locator('input[type=file]').setInputFiles(file('manual.png'));
    await page.waitForFunction(() => document.querySelectorAll('[data-reference-status="selected"]').length === 2);
    const preview = page.locator('[data-reference-preview]').first();
    await preview.click();
    await page.getByRole('dialog').waitFor();
    await page.evaluate(() => history.pushState(null, '', '/zh/create?mode=reference&template=gpt-image-2-on-chatgpt-f7a4c7af'));
    await page.waitForFunction(() => document.querySelectorAll('[data-reference-status="selected"]').length === 1);
    assert.equal(await page.getByRole('dialog').count(), 0, 'the viewer must not keep a revoked demo blob');
    assert.match(await page.locator('[data-reference-preview]').getAttribute('aria-label'), /manual\.png/);
    assert.deepEqual(paid, []);
  });
});

for (const width of [320, 390, 1440]) {
  test(`${width}px: local-only multiple images can be previewed, removed and sent together`, async () => {
    await withPage(width, async page => {
      const input = page.locator('input[type=file]');
      assert.equal(await input.getAttribute('multiple'), '', 'file picker supports multiple images');
      assert.equal(await page.locator('input[placeholder="https://"], input[type=url]').count(), 0, 'no link input');
      const zone = page.locator('[data-reference-images]');
      await zone.waitFor();
      const uploads = [];
      await page.route('**/api/generations/upload', async route => {
        const match = /filename="([^"]+)"/.exec(route.request().postDataBuffer().toString());
        uploads.push(match[1]);
        await route.fulfill({ json: { url: `https://uploads.example.test/${match[1]}` } });
      });
      await input.setInputFiles([file('one.png'), file('two.png'), file('three.png')]);
      await zone.getByRole('button', { name: '预览 one.png', exact: true }).waitFor();
      await page.waitForFunction(() => document.querySelectorAll('[data-reference-status="selected"]').length === 3);
      assert.deepEqual(uploads, [], 'selecting local files does not upload');
      const previews = zone.locator('button[data-reference-preview]');
      assert.equal(await previews.count(), 3);
      assert.ok(await previews.locator('img').evaluateAll(images => images.every(image => image.src.startsWith('blob:'))), 'all thumbnails use local blob previews');
      await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-reference-preview] img')).every(image => image.complete && image.naturalWidth === 1));
      assert.equal(await previews.first().locator('img').evaluate(image => image.naturalWidth), 1, 'local thumbnail loads');
      await zone.getByRole('button', { name: '预览 two.png', exact: true }).click();
      const viewer = page.getByRole('dialog');
      await viewer.waitFor();
      await page.waitForFunction(() => Array.from(document.querySelectorAll('[role=dialog] img')).some(img => img.naturalWidth === 1));
      assert.equal(await viewer.locator('a[download]').count(), 0, 'reference preview does not offer generated-image downloads');
      await viewer.getByRole('button', { name: '下一张 →', exact: true }).click();
      await viewer.getByRole('button', { name: '关闭', exact: true }).click();
      await viewer.waitFor({ state: 'hidden' });
      await zone.getByRole('button', { name: '移除 two.png', exact: true }).click();
      assert.equal(await previews.count(), 2);
      assert.equal((await page.evaluate(() => window.uploadPreviews.revoked)).length, 1);
      await input.setInputFiles(file('four.png'));
      await page.waitForFunction(() => document.querySelectorAll('[data-reference-status="selected"]').length === 3);
      assert.deepEqual(uploads, [], 'previewing, removing and adding files remain local');
      await page.locator('#op-create-prompt').fill('Use these references for a watercolor scene');
      const controls = page.locator('[data-create-controls] select');
      await controls.nth(0).selectOption('GPT Image 2.5 Flare');
      await controls.nth(1).selectOption('1:1');
      await controls.nth(3).selectOption('1k');
      await controls.nth(4).selectOption('1');
      let requestBody;
      await page.route('**/api/generations', route => {
        requestBody = route.request().postDataJSON();
        return route.fulfill({ json: { status: 'failed' } });
      });
      const generated = page.waitForResponse(response => response.url().endsWith('/api/generations'), { timeout: 5000 });
      await page.locator(width < 1024 ? '[data-mobile-generate] button' : '[data-create-generate]').click();
      await page.getByRole('dialog').waitFor();
      assert.deepEqual(uploads, [], 'Generate waits for anonymous confirmation before uploading');
      await page.getByRole('dialog').getByRole('button', { name: '继续匿名购买', exact: true }).click();
      await generated;
      await page.waitForFunction(() => document.querySelectorAll('[data-reference-status="ready"]').length === 3);
      assert.deepEqual(uploads, ['one.png', 'three.png', 'four.png'], 'only remaining files upload on submission');
      assert.deepEqual(requestBody.referenceImages, ['https://uploads.example.test/one.png', 'https://uploads.example.test/three.png', 'https://uploads.example.test/four.png']);
      assert.equal(requestBody.path, 'reference', 'the reference UI mode is preserved for server-side edit routing');
      assert.equal(requestBody.model, 'GPT Image 2.5 Flare');
      assert.equal(requestBody.quality, '1k');
      assert.equal(requestBody.aspectRatio, '1:1');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width, 'no horizontal overflow');
      for (const control of await zone.locator('button').all()) {
        assert.ok((await control.boundingBox()).height >= 36, 'reference controls are touch-sized');
      }
      await zone.screenshot({ path: `/tmp/op-mobile/${width}_reference-images.png` });
      await page.locator('main select').first().selectOption('edit');
      assert.equal(await previews.count(), 3, 'switching modes preserves references');
      await zone.getByRole('button', { name: '移除 one.png', exact: true }).click();
      await zone.getByRole('button', { name: '移除 three.png', exact: true }).click();
      await zone.getByRole('button', { name: '移除 four.png', exact: true }).click();
      assert.equal(await page.locator('[data-create-generate]').isDisabled(), true, 'edit requires a remaining reference');
      assert.equal((await page.evaluate(() => window.uploadPreviews.revoked)).length, 4);
    });
  });
}

test('reference preview traps keyboard focus and restores the thumbnail on close', async () => {
  await withPage(390, async page => {
    const uploads = [];
    await page.route('**/api/generations/upload', route => {
      uploads.push(route.request().url());
      return route.fulfill({ json: { url: 'https://uploads.example.test/keyboard.png' } });
    });
    await page.locator('input[type=file]').setInputFiles(file('keyboard.png'));
    await page.locator('[data-reference-status="selected"]').waitFor();
    const preview = page.getByRole('button', { name: '预览 keyboard.png', exact: true });
    await preview.focus();
    await page.keyboard.press('Enter');
    await page.getByRole('dialog').waitFor();
    await page.waitForFunction(() => document.querySelector('[role=dialog]')?.contains(document.activeElement), undefined, { timeout: 2000 });
    for (let index = 0; index < 5; index++) {
      await page.keyboard.press(index % 2 ? 'Shift+Tab' : 'Tab');
      assert.equal(await page.evaluate(() => document.querySelector('[role=dialog]').contains(document.activeElement)), true, 'focus stays inside the image viewer');
    }
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === '预览 keyboard.png', undefined, { timeout: 2000 });
    assert.equal(await preview.evaluate(element => element === document.activeElement), true, 'closing restores the initiating thumbnail');
    assert.equal(await preview.count(), 1, 'keyboard navigation did not remove the reference');
    assert.equal(await page.locator('[data-reference-status="selected"]').count(), 1);
    assert.deepEqual(uploads, [], 'keyboard preview remains local without submission');
  });
});

test('local drag/drop, validation and removing selected images preserve previews without uploading', async () => {
  await withPage(390, async page => {
    const input = page.locator('input[type=file]');
    assert.equal(await input.getAttribute('multiple'), '', 'multiple file input required');
    const zone = page.locator('[data-reference-images]');
    const uploads = [];
    await page.route('**/api/generations/upload', route => {
      uploads.push(route.request().url());
      return route.fulfill({ json: { url: 'https://uploads.example.test/unexpected.png' } });
    });
    await input.setInputFiles([file('good.png'), file('pending.png')]);
    await page.waitForFunction(() => document.querySelectorAll('[data-reference-status="selected"]').length === 2);
    await page.locator('#op-create-prompt').fill('A quiet landscape');
    assert.equal(await page.locator('[data-create-generate]').isEnabled(), true, 'local selection is sufficient before upload');
    await zone.getByRole('button', { name: '移除 pending.png', exact: true }).click();
    assert.equal(await page.locator('[data-create-generate]').isEnabled(), true, 'removing one local image preserves the remaining reference');
    assert.equal(await zone.getByRole('button', { name: '预览 pending.png', exact: true }).count(), 0);
    assert.deepEqual(uploads, [], 'removing a selected file avoids its upload');
    const dropped = await page.evaluateHandle(bytes => {
      const transfer = new DataTransfer();
      transfer.items.add(new File([new Uint8Array(bytes)], 'drop-one.png', { type: 'image/png' }));
      transfer.items.add(new File([new Uint8Array(bytes)], 'drop-two.png', { type: 'image/png' }));
      return transfer;
    }, [...png]);
    await zone.locator('[data-reference-dropzone]').dispatchEvent('dragenter', { dataTransfer: dropped });
    assert.equal(await zone.locator('[data-reference-dropzone]').getAttribute('data-dragging'), 'true');
    await zone.locator('[data-reference-dropzone]').dispatchEvent('drop', { dataTransfer: dropped });
    await page.waitForFunction(() => document.querySelectorAll('[data-reference-status="selected"]').length === 3);
    assert.equal(await zone.locator('[data-reference-dropzone]').getAttribute('data-dragging'), 'false');
    const link = await page.evaluateHandle(() => {
      const transfer = new DataTransfer();
      transfer.setData('text/uri-list', 'https://example.test/image.png');
      return transfer;
    });
    await zone.locator('[data-reference-dropzone]').dispatchEvent('drop', { dataTransfer: link });
    assert.equal(await zone.locator('[data-reference-status="selected"]').count(), 3, 'dropping links does not add references');
    await input.setInputFiles([{ name: 'text.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') }, { name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(8 * 1024 * 1024 + 1) }, file('valid.png')]);
    await zone.getByText(/text.txt/).waitFor();
    await zone.getByText(/large.png/).waitFor();
    await zone.getByRole('button', { name: '移除 valid.png', exact: true }).waitFor();
    assert.equal(await zone.locator('button[data-reference-preview]').count(), 4, 'only valid files get thumbnails');
    assert.equal(await zone.locator('[data-reference-status="selected"]').count(), 4);
    assert.ok(await zone.locator('[data-reference-preview] img').evaluateAll(images => images.every(image => image.src.startsWith('blob:'))), 'dropped and selected files use local blob previews');
    await zone.getByRole('button', { name: '移除 valid.png', exact: true }).click();
    await dropped.dispose();
    await link.dispose();
    await page.getByRole('link', { name: '首页', exact: true }).first().click();
    await page.locator('[data-reference-images]').waitFor({ state: 'detached' });
    assert.deepEqual(uploads, [], 'selection, drag/drop, validation and removal never upload without submission');
    const resources = await page.evaluate(() => window.uploadPreviews);
    assert.deepEqual(resources.created.slice().sort(), resources.revoked.slice().sort(), 'all local preview URLs released on removal or unmount');
  });
});

test('submitted partial upload failure blocks generation and retry reuses successful images', async () => {
  await withPage(390, async page => {
    const zone = page.locator('[data-reference-images]');
    const controls = page.locator('[data-create-controls] select');
    await controls.nth(0).selectOption('GPT Image 2.5 Flare');
    await controls.nth(1).selectOption('1:1');
    await controls.nth(3).selectOption('1k');
    await controls.nth(4).selectOption('1');
    const uploads = [];
    const generations = [];
    let releaseFailedUpload;
    const failedUploadStarted = new Promise(resolve => { releaseFailedUpload = resolve; });
    let retry = false;
    await page.route('**/api/generations/upload', route => {
      const name = /filename="([^"]+)"/.exec(route.request().postDataBuffer().toString())[1];
      uploads.push(name);
      if (name === 'bad.png' && !retry) {
        releaseFailedUpload(route);
        return;
      }
      return route.fulfill({ json: { url: `https://uploads.example.test/${name}` } });
    });
    await page.route('**/api/generations', route => {
      generations.push(route.request().postDataJSON());
      return route.fulfill({ json: { status: 'failed' } });
    });
    await page.locator('input[type=file]').setInputFiles([file('good.png'), file('bad.png')]);
    await page.waitForFunction(() => document.querySelectorAll('[data-reference-status="selected"]').length === 2);
    await page.locator('#op-create-prompt').fill('A quiet landscape');
    assert.deepEqual(uploads, [], 'failure is not attempted until submission');
    const submit = async () => {
      const uploadsBeforeConfirmation = uploads.length;
      await page.locator('[data-mobile-generate] button').click();
      await page.getByRole('dialog').waitFor();
      assert.equal(uploads.length, uploadsBeforeConfirmation, 'each submission waits for anonymous confirmation before upload');
      await page.getByRole('dialog').getByRole('button', { name: '继续匿名购买', exact: true }).click();
    };
    await submit();
    const failedRoute = await failedUploadStarted;
    await zone.locator('[data-reference-status="uploading"]').waitFor();
    assert.equal(await zone.locator('[data-reference-status="ready"]').count(), 1);
    assert.equal(await page.locator('[data-create-generate]').isDisabled(), true, 'submitted pending upload blocks duplicate generation');
    assert.deepEqual(generations, [], 'generation waits for every submitted reference');
    await failedRoute.fulfill({ status: 502, json: { error: 'upload_failed' } });
    await zone.locator('[data-reference-status="failed"]').waitFor();
    await zone.getByText('图片上传失败', { exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-create-generate]').disabled);
    assert.equal(await zone.locator('[data-reference-status="ready"]').count(), 1, 'failed upload retains the successful reference');
    assert.deepEqual(generations, [], 'partial failure never submits an incomplete reference set');
    retry = true;
    const generated = page.waitForResponse(response => response.url().endsWith('/api/generations'), { timeout: 5000 });
    await submit();
    await generated;
    await page.waitForFunction(() => document.querySelectorAll('[data-reference-status="ready"]').length === 2);
    assert.deepEqual(uploads, ['good.png', 'bad.png', 'bad.png'], 'new submission retries only the failed local file without reselection');
    assert.equal(generations.length, 1);
    assert.equal(generations[0].path, 'reference');
    assert.equal(generations[0].model, 'GPT Image 2.5 Flare');
    assert.equal(generations[0].quality, '1k');
    assert.equal(generations[0].aspectRatio, '1:1');
    assert.deepEqual(generations[0].referenceImages, ['https://uploads.example.test/good.png', 'https://uploads.example.test/bad.png']);
  });
});
