const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const referenceFile = path.resolve(__dirname, '../public/creation-references/watercolor-lakeside-reference.jpg');
const secondReferenceFile = path.resolve(__dirname, '../public/creation-references/watercolor-cats-reference.jpg');
const prompts = {
  text: '生成一幅水彩风格的山间湖泊，晨雾、柔和光线',
  reference: '保留参考图主体特征，转换为水彩插画',
  edit: '保留参考图主体，将背景替换为蓝色',
};
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

async function withPage(mode, width, run) {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: width < 768, hasTouch: width < 768 });
  const page = await context.newPage();
  const evidence = { uploads: [], generations: [], events: [], polls: 0 };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/api/auth/session', route => route.fulfill({ json: {} }));
  await page.route('**/api/billing/balance', route => route.fulfill({ json: { balance: 10000 } }));
  await page.route('https://app.pageview.app/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await page.route('https://pbs.twimg.com/**', route => route.fulfill({ contentType: 'image/png', body: png }));
  await page.route('https://uploads.example.test/**', route => route.fulfill({ contentType: 'image/png', body: png }));
  await page.route('**/api/generations/upload', async route => {
    const body = route.request().postDataBuffer();
    const filename = /filename="([^"]+)"/.exec(body.toString())[1];
    evidence.uploads.push(filename);
    evidence.events.push(`upload:${filename}`);
    if (evidence.uploadHandler) return evidence.uploadHandler(route, filename);
    return route.fulfill({ json: { url: `https://uploads.example.test/${filename}` } });
  });
  await page.route('**/api/generations', async route => {
    const body = route.request().postDataJSON();
    evidence.generations.push(body);
    evidence.events.push('generate');
    if (evidence.generateHandler) return evidence.generateHandler(route);
    return route.fulfill({ json: { status: 'running', providerJobId: 'test-mode-job', generationId: 'test-mode-generation' } });
  });
  await page.route('**/api/generations/test-mode-job*', route => {
    evidence.polls++;
    return route.fulfill({ json: evidence.polls === 1
      ? { status: 'running' }
      : { status: 'succeeded', images: ['/__test-mode-result.svg'] } });
  });
  await page.route('**/__test-mode-result.svg', route => route.fulfill({ contentType: 'image/svg+xml', body: '<svg xmlns="http://www.w3.org/2000/svg" width="900" height="600"><rect width="900" height="600" fill="#adc9be"/><circle cx="450" cy="300" r="160" fill="#eff5eb"/></svg>' }));
  try {
    const response = await page.goto(`http://localhost:3000/zh/create?mode=${mode}`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200);
    const controls = page.locator('[data-create-controls] select');
    await controls.nth(0).selectOption(mode !== 'text' ? 'GPT Image 2.5 Flare' : 'GPT Image 2');
    await controls.nth(1).selectOption('1:1');
    await controls.nth(3).selectOption(mode !== 'text' ? '1k' : '2k');
    await controls.nth(4).selectOption('1');
    await run(page, evidence);
    assert.deepEqual(errors, [], 'no uncaught application errors');
  } finally {
    await context.close();
    await browser.close();
  }
}

async function submit(page, width) {
  const button = page.locator(width < 1024 ? '[data-mobile-generate] button' : '[data-create-generate]');
  await page.locator('#op-create-prompt').evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  await button.click();
  await page.getByRole('dialog').getByRole('button', { name: '继续匿名购买', exact: true }).click();
}

for (const width of [390, 1440]) {
  for (const mode of ['text', 'reference', 'edit']) {
    test(`${mode}/${width}px: actual prompt and local image submit through the correct generation path`, async () => {
      await withPage(mode, width, async (page, evidence) => {
        assert.equal(await page.locator('[data-create-generate]').isDisabled(), true, 'an empty prompt cannot submit');
        if (mode === 'text') await page.locator('main select').first().selectOption('reference');
        await page.locator('input[type=file]').setInputFiles(referenceFile);
        await page.waitForFunction(() => Array.from(document.querySelectorAll('[data-reference-preview] img')).some(image => image.complete && image.naturalWidth > 100));
        assert.deepEqual(evidence.uploads, [], 'selecting a local image never uploads before submit');
        if (mode === 'text') await page.locator('main select').first().selectOption('text');
        await page.locator('#op-create-prompt').fill(`  ${prompts[mode]}  `);
        await submit(page, width);
        await page.waitForFunction(() => {
          const image = document.querySelector('[data-create-result-grid] img');
          return image?.complete && image.naturalWidth === 900;
        });
        assert.equal(evidence.generations.length, 1);
        const request = evidence.generations[0];
        assert.equal(request.prompt, prompts[mode], 'the entered prompt reaches the request without outer whitespace');
        assert.equal(request.path, mode === 'text' ? 'text-to-image' : mode);
        assert.equal(request.model, mode !== 'text' ? 'GPT Image 2.5 Flare' : 'GPT Image 2');
        assert.equal(request.quality, mode !== 'text' ? '1k' : '2k');
        assert.equal(request.aspectRatio, '1:1');
        assert.equal(request.count, 1);
        assert.deepEqual(request.referenceImages, mode === 'text' ? [] : ['https://uploads.example.test/watercolor-lakeside-reference.jpg']);
        assert.deepEqual(evidence.events, mode === 'text' ? ['generate'] : ['upload:watercolor-lakeside-reference.jpg', 'generate']);
        assert.ok(evidence.polls >= 2, 'the page waits for asynchronous completion');
        await page.waitForFunction(expected => JSON.parse(localStorage.getItem('op_create_history') || '[]').some(entry => entry.prompt.trim() === expected && entry.images.length === 1), prompts[mode]);
        if (mode !== 'text') assert.equal(await page.locator('[data-reference-status="ready"]').count(), 1, 'submission retains the user reference');
        const stage = page.locator('[data-create-stage]');
        await stage.screenshot({ path: `/tmp/op-mobile/${width}_${mode}_generation-tested.png`, animations: 'disabled' });
        await stage.getByRole('button', { name: '全屏查看', exact: true }).last().click();
        await page.getByRole('dialog').waitFor();
        await page.keyboard.press('Escape');
        await page.getByRole('dialog').waitFor({ state: 'hidden' });
        const download = page.waitForEvent('download');
        await stage.getByRole('button', { name: '下载', exact: true }).first().click();
        assert.ok((await download).suggestedFilename().length > 0);
      });
    });
  }
}

for (const mode of ['reference', 'edit']) {
  test(`${mode}: missing image and removed local images cannot submit`, async () => {
    await withPage(mode, 390, async (page, evidence) => {
      await page.locator('#op-create-prompt').fill(prompts[mode]);
      assert.equal(await page.locator('[data-create-generate]').isDisabled(), true, 'reference and edit need an image');
      await page.locator('input[type=file]').setInputFiles(referenceFile);
      await page.locator('[data-reference-preview]').waitFor();
      assert.equal(await page.locator('[data-create-generate]').isEnabled(), true, 'a valid local file is sufficient before upload');
      await page.getByRole('button', { name: '移除 watercolor-lakeside-reference.jpg', exact: true }).click();
      assert.equal(await page.locator('[data-create-generate]').isDisabled(), true);
      assert.deepEqual(evidence.uploads, []);
      assert.deepEqual(evidence.generations, []);
    });
  });
}

test('reference: removing a selected image avoids its upload and concurrent submits', async () => {
  await withPage('reference', 1440, async (page, evidence) => {
    await page.locator('input[type=file]').setInputFiles([referenceFile, secondReferenceFile]);
    await page.locator('[data-reference-preview]').first().waitFor();
    await page.getByRole('button', { name: '移除 watercolor-cats-reference.jpg', exact: true }).click();
    assert.deepEqual(evidence.uploads, []);
    await page.locator('#op-create-prompt').fill(prompts.reference);
    let releaseUpload;
    const uploadStarted = new Promise(resolve => { releaseUpload = resolve; });
    evidence.uploadHandler = route => { releaseUpload(route); };
    await submit(page, 1440);
    const route = await uploadStarted;
    assert.equal(await page.locator('[data-create-generate]').isDisabled(), true, 'preparing a submitted upload disables duplicate submission');
    assert.deepEqual(evidence.generations, [], 'generation waits for uploads');
    await route.fulfill({ json: { url: 'https://uploads.example.test/watercolor-lakeside-reference.jpg' } });
    await page.waitForFunction(() => document.querySelector('[data-create-result-grid] img')?.naturalWidth === 900);
    assert.deepEqual(evidence.uploads, ['watercolor-lakeside-reference.jpg']);
    assert.equal(evidence.generations.length, 1);
  });
});

for (const mode of ['reference', 'edit']) {
  test(`${mode}: failed upload stops generation and a new submit retries the local file`, async () => {
    await withPage(mode, 1440, async (page, evidence) => {
      evidence.uploadHandler = route => route.fulfill({ status: 502, json: { error: 'upload_failed' } });
      await page.locator('input[type=file]').setInputFiles(referenceFile);
      await page.locator('[data-reference-preview]').waitFor();
      assert.deepEqual(evidence.uploads, []);
      await page.locator('#op-create-prompt').fill(prompts[mode]);
      await submit(page, 1440);
      await page.locator('[data-reference-status="failed"]').waitFor();
      assert.deepEqual(evidence.generations, [], 'an incomplete reference never reaches the generation API');
      assert.equal(await page.locator('[data-create-generate]').isEnabled(), true, 'the retained file can retry without reselection');
      evidence.uploadHandler = null;
      await submit(page, 1440);
      await page.waitForFunction(() => document.querySelector('[data-create-result-grid] img')?.naturalWidth === 900);
      assert.equal(evidence.uploads.length, 2);
      assert.equal(evidence.generations.length, 1);
    });
  });
}

for (const mode of ['text-to-image', 'reference', 'edit']) {
  test(`coming soon: Nano Banana cannot start ${mode} generation`, async () => {
    const response = await fetch('http://localhost:3000/zh/api/generations', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: 'A watercolor lake', model: 'Nano Banana 2', path: mode, quality: '1k', referenceImages: mode === 'text-to-image' ? [] : ['https://uploads.example.test/reference.jpg'] }),
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'model_coming_soon' });
  });
}

const modelLimits = [
  ['GPT Image 2.6 Sunburst', 16],
  ['GPT Image 2.6 Flare', 16],
  ['GPT Image 2.5 Sunburst', 16],
  ['GPT Image 2.5 Flare', 16],
  ['GPT Image 2', 10],
];
const localImages = count => Array.from({ length: count }, (_, index) => ({
  name: `reference-${index}.jpg`, mimeType: 'image/jpeg', buffer: readFileSync(referenceFile),
}));

for (const [model, max] of modelLimits) {
  test(`${model}: file selection respects the official reference cap without uploading`, async () => {
    await withPage('reference', 1440, async (page, evidence) => {
      await page.locator('[data-create-controls] select').nth(0).selectOption(model);
      await page.locator('input[type=file]').setInputFiles([
        { name: 'invalid.txt', mimeType: 'text/plain', buffer: Buffer.from('not an image') },
        ...localImages(max + 1),
      ]);
      assert.equal(await page.locator('[data-reference-preview]').count(), max, 'invalid files do not consume slots; excess files are refused');
      assert.ok((await page.locator('[data-reference-images]').innerText()).includes(`${max}/${max}`));
      assert.ok((await page.locator('[data-reference-images]').innerText()).includes(`最多支持 ${max} 张`));
      assert.deepEqual(evidence.uploads, []);
      assert.deepEqual(evidence.generations, []);
    });
  });
}

test('switching to a smaller model blocks submission until excess references are removed', async () => {
  await withPage('reference', 1440, async (page, evidence) => {
    await page.locator('input[type=file]').setInputFiles(localImages(16));
    await page.locator('#op-create-prompt').fill(prompts.reference);
    await page.locator('[data-create-controls] select').nth(0).selectOption('GPT Image 2');
    assert.equal(await page.locator('[data-reference-preview]').count(), 16, 'switching models does not delete user files');
    assert.equal(await page.locator('[data-create-generate]').isDisabled(), true);
    assert.ok((await page.locator('[data-reference-images]').innerText()).includes('16/10'));
    assert.ok((await page.getByRole('main').innerText()).includes('最多支持 10 张'));
    for (let index = 10; index < 16; index++) {
      await page.getByRole('button', { name: `移除 reference-${index}.jpg`, exact: true }).click();
    }
    assert.equal(await page.locator('[data-create-generate]').isEnabled(), true);
    assert.deepEqual(evidence.uploads, []);
    await page.locator('[data-reference-images]').screenshot({ path: '/tmp/op-mobile/reference-count-limit.png' });
  });
});

for (const mode of ['reference', 'edit']) {
  for (const [model, max] of modelLimits) {
    test(`${mode}/${model}: the real API rejects max+1 before identity or billing`, async () => {
      const response = await fetch('http://localhost:3000/zh/api/generations', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: prompts[mode], model, path: mode, quality: '1k', aspectRatio: '1:1', referenceImages: Array(max + 1).fill('https://uploads.example.test/reference.jpg') }),
      });
      assert.equal(response.status, 400);
      assert.deepEqual(await response.json(), { error: 'too_many_reference_images', max });
      const atLimit = await fetch('http://localhost:3000/zh/api/generations', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt: prompts[mode], model, path: mode, quality: '1k', aspectRatio: '1:1', referenceImages: Array(max).fill('https://uploads.example.test/reference.jpg') }),
      });
      const atLimitBody = await atLimit.json();
      assert.ok(['unpriced', 'no_identity'].includes(atLimitBody.error), 'exactly max references pass count validation but never generate without identity or pricing');
    });
  }
}
