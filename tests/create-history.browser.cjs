const { test } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { readFileSync, mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { createHash } = require('node:crypto');
const artwork = readFileSync('public/local_images/gpt-image2-prompts/98_high-tech-lab-combat-scene.jpg');
const secondArtwork = readFileSync('public/local_images/gpt-image2-prompts/97_bold-cinematic-fitness-strength-campaign.jpg');
const cacheSources = ['https://history-fixture.example.invalid/one.jpg', 'https://history-fixture.example.invalid/two.jpg'];
const cacheDatabase = 'open-prompts-create-images';

async function installCacheFixtures(context, expired = false) {
  const errors = [];
  const sourceRequests = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.route('**/api/auth/session', route => route.fulfill({ json: { user: { id: 'history-test', name: 'Test' }, expires: '2099-01-01T00:00:00Z' } }));
  await context.route('**/api/billing/balance', route => route.fulfill({ json: { balance: 10000 } }));
  await context.route('https://app.pageview.app/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.pathname.includes('/api/generations/upload')) throw new Error('Real uploads forbidden');
    const original = url.searchParams.get('url');
    if (original && cacheSources.includes(original)) {
      sourceRequests.push(original);
      return expired ? route.fulfill({status:410,body:'expired'}) : route.fulfill({contentType:'image/jpeg',body:original === cacheSources[0] ? artwork : secondArtwork});
    }
    if (route.request().resourceType() === 'image') return route.fulfill({contentType:'image/jpeg',body:artwork});
    return route.fallback();
  });
  await context.route('**/api/generations', route => route.fulfill({json:{status:'running',providerJobId:'cache-job'}}));
  await context.route('**/api/generations/cache-job', route => route.fulfill({json:{status:'succeeded',images:cacheSources}}));
  return {errors,sourceRequests};
}

async function generateCacheFixture(page) {
  await page.goto('http://localhost:3000/zh/create', {waitUntil:'domcontentloaded'});
  const controls = page.locator('[data-create-controls] select:visible');
  await controls.first().selectOption('GPT Image 2');
  await controls.nth(1).selectOption('1:1');
  await controls.nth(3).selectOption('2k');
  await page.locator('#op-create-prompt:visible').fill('保存两张真实图片的完整提示词');
  await page.locator('[data-create-generate]:visible').click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('op_create_history') || '[]').length === 1);
}

async function waitForCachedImages(page, count) {
  const persisted = await page.evaluate(async ({name,count}) => {
    const deadline = Date.now() + 5000;
    let found = -1;
    do {
      if ((await indexedDB.databases()).some(database => database.name === name)) {
        found = await new Promise(resolve => {
          const request = indexedDB.open(name);
          request.onsuccess = () => {
            const database = request.result;
            const query = database.transaction('images').objectStore('images').getAll();
            query.onsuccess = () => {database.close(); resolve(query.result.filter(value => value instanceof Blob).length);};
            query.onerror = () => {database.close(); resolve(-1);};
          };
          request.onerror = () => resolve(-1);
        });
      }
      if (found === count) return found;
      await new Promise(resolve => setTimeout(resolve, 25));
    } while (Date.now() < deadline);
    return found;
  }, {name:cacheDatabase,count});
  assert.equal(persisted, count, `${count} original image files must be persisted, not just their URLs`);
}

async function assertArtworkDownload(page, action, expected) {
  const [download] = await Promise.all([page.waitForEvent('download'), action.click()]);
  assert.match(download.suggestedFilename(), /\.jpe?g$/);
  const bytes = readFileSync(await download.path());
  assert.equal(createHash('sha256').update(bytes).digest('hex'), createHash('sha256').update(expected).digest('hex'));
}

const seedSizes = [[900, 600], [600, 900], [600, 600], [1280, 720], [720, 1280], [900, 600]];
const seed = Array.from({ length: 6 }, (_, i) => ({ id: `seed-${i}`, createdAt: 1794000000000 - i * 1000, providerJobId: `seed-job-${i}`, prompt: `历史水彩湖泊 ${i}`, model: 'GPT Image 2.6 Sunburst', provider: 'internal', aspectRatio: ['3:2', '2:3', '1:1', '16:9', '9:16', '1:1'][i], quality: '1k', count: i === 0 ? 2 : 1, images: i === 0 ? ['/__history-result.svg?seed=0', '/__history-result.svg?seed=0&second'] : [`/__history-result.svg?seed=${i}`] }));

async function setup(width) {
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE });
  const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 768, hasTouch: width < 768 });
  const errors = [];
  context.on('page', page => page.on('pageerror', error => errors.push(error.message)));
  await context.route('**/api/auth/session', route => route.fulfill({ json: { user: { id: 'history-test', name: 'Test' }, expires: '2099-01-01T00:00:00Z' } }));
  await context.route('**/api/billing/balance', route => route.fulfill({ json: { balance: 10000 } }));
  await context.route('https://app.pageview.app/**', route => route.fulfill({ contentType: 'application/javascript', body: '' }));
  await context.route('**/__history-result.svg*', route => {
    const [width, height] = seedSizes[Number(new URL(route.request().url()).searchParams.get('seed') || 0)];
    return route.fulfill({ contentType: 'image/svg+xml', body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="${width}" height="${height}" fill="#adc9be"/><circle cx="${width / 2}" cy="${height / 2}" r="160" fill="#eff5eb"/></svg>` });
  });
  let jobs = 0;
  await context.route('**/api/generations', route => route.fulfill({ json: { status: 'running', providerJobId: `history-job-${++jobs}` } }));
  await context.route('**/api/generations/history-job-*', route => route.fulfill({ json: { status: 'succeeded', images: ['/__history-result.svg'] } }));
  return { browser, context, errors };
}

async function openHistory(page) {
  await page.locator('[data-create-stage]').getByRole('button', { name: '历史', exact: true }).click();
}

for (const width of [390, 1440]) {
  test(`history/${width}px: natural-ratio masonry keeps fullscreen, download, reuse and delete`, async () => {
    const { browser, context, errors } = await setup(width);
    try {
      await context.addInitScript(entries => {
        if (location.origin === 'http://localhost:3000') localStorage.setItem('op_create_history', JSON.stringify(entries));
      }, seed);
      const page = await context.newPage();
      await page.goto('http://localhost:3000/zh/create', { waitUntil: 'domcontentloaded' });
      await openHistory(page);
      const cards = page.locator('[data-history-card]');
      await cards.first().waitFor();
      assert.equal(await cards.count(), 6);
      await page.waitForFunction(() => [...document.querySelectorAll('[data-history-card] img')].every(image => image.complete && image.naturalWidth > 0));
      const imageBoxes = await cards.locator('img').evaluateAll(images => images.map(image => { const { width, height } = image.getBoundingClientRect(); return { width, height, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight }; }));
      for (const image of imageBoxes) assert.ok(Math.abs((image.width / image.height) / (image.naturalWidth / image.naturalHeight) - 1) < 0.01, 'images fill their width at the original ratio without letterboxing or cropping');
      await page.waitForFunction(() => document.querySelector('[data-history-grid] [data-masonry-ready="true"]'));
      const boxes = await cards.evaluateAll(elements => elements.map(element => { const { x, y, width, height } = element.getBoundingClientRect(); return { x, y, width, height, radius: getComputedStyle(element).borderRadius }; }));
      const firstRow = boxes.filter(box => Math.abs(box.y - boxes[0].y) < 1);
      assert.equal(firstRow.length, width < 1024 ? 2 : 4, 'history uses two mobile columns and four desktop columns');
      assert.ok(boxes.every(box => Math.abs(box.width - boxes[0].width) < 1), 'all cards have equal widths');
      if (width >= 1024) assert.ok(boxes[0].width > 160, 'desktop cards are wider than 160px');
      const gridWidth = await page.locator('[data-history-grid]').evaluate(element => element.getBoundingClientRect().width);
      assert.ok(Math.abs(firstRow.reduce((sum, box) => sum + box.width, 0) + (firstRow.length - 1) * 16 - gridWidth) < 2, 'columns fill the grid without leftover space');
      assert.ok(Math.max(...boxes.map(box => box.height)) - Math.min(...boxes.map(box => box.height)) > 80, 'card heights follow the mixed image ratios');
      for (const box of boxes.filter(box => box.y > boxes[0].y + 1)) {
        const above = boxes.filter(candidate => Math.abs(candidate.x - box.x) < 1 && candidate.y < box.y);
        assert.ok(Math.abs(box.y - Math.max(...above.map(candidate => candidate.y + candidate.height)) - 16) < 2, 'masonry packs cards without fixed-height row gaps');
      }
      assert.ok(boxes.every(box => box.radius === '0px'), 'history cards have square corners');
      assert.ok(boxes[0].y === boxes[1].y && boxes[0].x !== boxes[1].x, 'multiple columns are visible');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const textHeight = await cards.first().locator('p').evaluate(element => element.parentElement.getBoundingClientRect().height);
      assert.ok(textHeight <= 64, `history text block is compact, got ${textHeight}px`);
      assert.equal(await cards.first().locator('p').getAttribute('title'), seed[0].prompt, 'full prompt remains available');
      const imageBox = await cards.first().getByRole('button', { name: '全屏查看', exact: true }).boundingBox();
      assert.ok(Math.abs(imageBox.width / imageBox.height - 1.5) < 0.01, 'landscape thumbnail keeps its actual ratio');
      if (width < 768) assert.ok((await cards.first().getByRole('button', { name: '复用', exact: true }).boundingBox()).height >= 44, 'mobile actions remain easy to tap');
      await cards.first().getByRole('button', { name: '全屏查看', exact: true }).click();
      await page.getByRole('dialog').waitFor();
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      const download = page.waitForEvent('download');
      await cards.first().getByRole('button', { name: '下载', exact: true }).click();
      assert.ok((await download).suggestedFilename().startsWith('op_'));
      await cards.first().getByRole('button', { name: '复用', exact: true }).click();
      assert.equal(await page.locator('#op-create-prompt:visible').inputValue(), seed[0].prompt);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('op_create_history')).length), 6, 'reuse never creates a duplicate generation');
      await openHistory(page);
      await cards.first().getByRole('button', { name: '删除', exact: true }).click();
      await page.waitForFunction(() => document.querySelectorAll('[data-history-card]').length === 5);
      assert.equal(await cards.count(), 5);
      await page.locator('[data-history-grid]').screenshot({ path: `/tmp/history-grid-${width}.png` });
      assert.deepEqual(errors, []);
    } finally { await context.close(); await browser.close(); }
  });
}

for (const [width, count] of [[1024, 24], [1440, 24], [1440, 0], [390, 24]]) {
  test(`history layout/${width}px/${count} entries: saved images replace inspiration without growing desktop controls`, async () => {
    const { browser, context, errors } = await setup(width);
    try {
      const entries = Array.from({length:count}, (_, i) => ({...seed[i % seed.length], id:`layout-${i}`}));
      await context.addInitScript(entries => {
        if (location.origin === 'http://localhost:3000') localStorage.setItem('op_create_history', JSON.stringify(entries));
      }, entries);
      const forbidden = [];
      await context.route('**/api/generations**', route => {
        forbidden.push(route.request().url());
        return route.abort();
      });
      const page = await context.newPage();
      await page.goto('http://localhost:3000/zh/create', {waitUntil:'domcontentloaded'});
      const stage = page.locator('[data-create-stage]');
      const controls = page.locator('[data-create-workspace] > div > main');
      await controls.waitFor({state:'visible'});
      await page.locator('[data-create-inspiration]').waitFor();
      const initialControls = await controls.boundingBox();
      await openHistory(page);
      await page.waitForFunction(expected => document.querySelectorAll('[data-history-card]').length === expected, count);
      assert.equal(await page.locator('[data-history-card]').count(), count);
      assert.equal(await page.locator('[data-create-inspiration]').count(), 0, 'history must not render inspiration');
      if (width >= 1024) {
        const [left, right] = await Promise.all([controls.boundingBox(), stage.boundingBox()]);
        assert.ok(Math.abs(left.height - initialControls.height) < 1, 'saved images do not enlarge the controls panel');
        assert.ok(Math.abs(left.height - right.height) < 1, `history height ${right.height} must match controls ${left.height}`);
        assert.ok(Math.abs(left.y - right.y) < 1, 'history and controls start together');
        if (count) {
          const scroller = stage.locator('.overflow-y-auto');
          await page.waitForFunction(() => document.querySelector('[data-history-grid] [data-masonry-ready="true"]'));
          assert.ok(await scroller.evaluate(element => element.scrollHeight > element.clientHeight), 'many saved images scroll inside the matched panel');
          await scroller.evaluate(element => {element.scrollTop = element.scrollHeight;});
          assert.ok(await scroller.evaluate(element => element.scrollTop > 0));
          await page.locator('[data-history-card]').last().getByRole('button', {name:'复用',exact:true}).scrollIntoViewIfNeeded();
          const action = await page.locator('[data-history-card]').last().getByRole('button', {name:'复用',exact:true}).boundingBox();
          const panel = await stage.boundingBox();
          assert.ok(action.y >= panel.y && action.y + action.height <= panel.y + panel.height + 1, 'last history actions remain reachable inside the panel');
        }
      } else {
        assert.ok((await stage.boundingBox()).height > 900, 'mobile history keeps natural document height');
      }
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (width >= 1024) {
        await stage.locator('.overflow-y-auto').evaluate(element => {element.scrollTop = 0;});
        await page.evaluate(() => window.scrollTo(0, 0));
      } else {await stage.scrollIntoViewIfNeeded();}
      await page.screenshot({path:`/tmp/history-panel-${width}-${count}.png`});
      await stage.getByRole('button', {name:'当前',exact:true}).click();
      await page.locator('[data-create-inspiration]').waitFor();
      assert.deepEqual(forbidden, []);
      assert.deepEqual(errors, []);
    } finally {await context.close(); await browser.close();}
  });
}

test('generated original files survive Chrome restart and expired links for preview, viewer, reuse and downloads', async () => {
  const profile = mkdtempSync(join(tmpdir(), 'create-history-cache-'));
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  let context;
  try {
    context = await chromium.launchPersistentContext(profile, {executablePath,viewport:{width:1440,height:900}});
    const online = await installCacheFixtures(context);
    const first = await context.newPage();
    await generateCacheFixture(first);
    await waitForCachedImages(first, 2);
    assert.deepEqual(await first.evaluate(() => JSON.parse(localStorage.getItem('op_create_history'))[0].images), cacheSources, 'stable original URLs, not temporary blob URLs, remain in metadata');
    assert.deepEqual(online.errors, []);
    await context.close();
    context = await chromium.launchPersistentContext(profile, {executablePath,viewport:{width:1440,height:900}});
    const expired = await installCacheFixtures(context, true);
    const page = await context.newPage();
    await page.goto('http://localhost:3000/zh/create', {waitUntil:'domcontentloaded'});
    await openHistory(page);
    await page.waitForFunction(() => {
      const image = document.querySelector('[data-history-card] img');
      return image?.src.startsWith('blob:') && image.complete && image.naturalWidth > 1;
    });
    const card = page.locator('[data-history-card]');
    await assertArtworkDownload(page, card.getByRole('button',{name:'下载',exact:true}), artwork);
    await card.getByRole('button',{name:'全屏查看',exact:true}).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button',{name:'下一张 →',exact:true}).click();
    await page.waitForFunction(() => {
      const dialog = document.querySelector('[role="dialog"]');
      const strip = dialog?.querySelector('.op-viewer-strip');
      const image = dialog?.querySelectorAll('img')[1];
      return strip && Math.abs(strip.scrollLeft - strip.clientWidth) < 1 && image?.src.startsWith('blob:') && image.complete && image.naturalWidth > 1 && dialog.querySelector('a[download]')?.href === image.src;
    });
    await assertArtworkDownload(page, dialog.getByRole('link',{name:'下载',exact:true}), secondArtwork);
    await page.keyboard.press('Escape');
    await card.getByRole('button',{name:'复用',exact:true}).click();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-create-result-grid] img')].every(image => image.src.startsWith('blob:') && image.complete && image.naturalWidth > 1));
    assert.equal(await page.locator('#op-create-prompt:visible').inputValue(), '保存两张真实图片的完整提示词');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('op_create_history')).length), 1);
    assert.deepEqual(expired.sourceRequests, [], 'preview, viewer, reuse and download never need the expired originals');
    assert.deepEqual(expired.errors, []);
    await page.screenshot({path:'/tmp/create-history-cache-restarted.png'});
  } finally {
    await context?.close();
    rmSync(profile, {recursive:true,force:true});
  }
});

for (const failure of ['denied', 'quota', 'network']) {
  test(`image persistence ${failure}: silently keeps working original links`, async () => {
    const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
    const context = await browser.newContext({viewport:{width:1440,height:900}});
    try {
      const {errors} = await installCacheFixtures(context);
      await context.addInitScript(({failure,name}) => {
        if (failure === 'denied') Object.defineProperty(window,'indexedDB',{get(){throw new DOMException('Denied','SecurityError');}});
        if (failure === 'quota') {
          const put = IDBObjectStore.prototype.put;
          IDBObjectStore.prototype.put = function(...args) {
            if (this.transaction.db.name === name) throw new DOMException('Full','QuotaExceededError');
            return put.apply(this,args);
          };
        }
        if (failure === 'network') {
          const originalFetch = window.fetch;
          window.fetch = (...args) => String(args[0]).includes('/api/image-proxy') ? Promise.reject(new TypeError('Cache fetch unavailable')) : originalFetch(...args);
        }
      }, {failure,name:cacheDatabase});
      const page = await context.newPage();
      await generateCacheFixture(page);
      await openHistory(page);
      await page.waitForFunction(() => {
        const image = document.querySelector('[data-history-card] img');
        return image?.complete && image.naturalWidth > 1;
      });
      assert.ok((await page.locator('[data-history-card] img').getAttribute('src')).includes('/api/image-proxy'), 'failed persistence falls back to the original image transport');
      assert.equal(await page.locator('[data-create-stage]').getByRole('alert').count(), 0);
      assert.ok(!/缓存失败|保存失败|存储不足/.test(await page.locator('[data-create-stage]').innerText()));
      assert.deepEqual(errors, []);
    } finally {await context.close(); await browser.close();}
  });
}

test('deleting and readding a queued image performs one load and revokes every created object URL', async () => {
  const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  const context = await browser.newContext();
  try {
    await context.route('**/__cache-lifecycle-test',route => route.fulfill({contentType:'text/html',body:'<!doctype html><title>Cache lifecycle test</title>'}));
    const page = await context.newPage();
    await page.goto('http://localhost:3000/__cache-lifecycle-test');
    const bundle = require('esbuild').buildSync({entryPoints:['src/lib/create/history-images.ts'],bundle:true,format:'iife',globalName:'HistoryCache',write:false});
    await page.addScriptTag({content:bundle.outputFiles[0].text});
    const result = await page.evaluate(async bytes => {
      const sources = Array.from({length:5},(_,index) => `/__queue-image/${index}.jpg`);
      const requests = [];
      const releases = [];
      const liveUrls = new Set();
      const createUrl = URL.createObjectURL;
      const revokeUrl = URL.revokeObjectURL;
      URL.createObjectURL = blob => {const url = createUrl(blob); liveUrls.add(url); return url;};
      URL.revokeObjectURL = url => {liveUrls.delete(url); revokeUrl(url);};
      let hold = true;
      window.fetch = async source => {
        requests.push(source);
        if (hold) await new Promise(resolve => releases.push(resolve));
        return new Response(new Uint8Array(bytes),{headers:{'content-type':'image/jpeg'}});
      };
      let resolved = {};
      const cache = HistoryCache.createHistoryImageCache(() => sources,source => source,value => {resolved = value;});
      cache.sync(sources);
      const wait = async condition => {
        const deadline = Date.now() + 3000;
        while (!condition() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve,10));
      };
      await wait(() => releases.length === 3);
      cache.sync(sources.slice(0,4));
      cache.sync(sources);
      hold = false;
      releases.forEach(release => release());
      await wait(() => Object.keys(resolved).length === 5);
      cache.dispose();
      return {lastImageRequests:requests.filter(source => source === sources[4]).length,remainingUrls:liveUrls.size};
    }, Array.from(artwork));
    assert.equal(result.lastImageRequests, 1, 'a cancelled queue entry must not start the replacement job a second time');
    assert.equal(result.remainingUrls, 0, 'disposing the page releases all object URLs, including overwritten loads');
  } finally {await context.close(); await browser.close();}
});

for (const entryPoint of ['history', 'viewer']) {
  test(`an immediate ${entryPoint} download waits for cached files instead of requesting an expired original`, async () => {
  const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  const context = await browser.newContext({viewport:{width:1440,height:900}});
  try {
    await installCacheFixtures(context);
    const first = await context.newPage();
    await generateCacheFixture(first);
    await waitForCachedImages(first, 2);
    await first.close();
    await context.addInitScript(() => {
      const decode = window.createImageBitmap;
      window.__releaseCachedImages = [];
      window.createImageBitmap = (...args) => new Promise(resolve => {
        window.__releaseCachedImages.push(() => resolve(decode(...args)));
      });
    });
    await context.route('**/api/image-proxy*', route => route.fulfill({status:410,body:'expired'}));
    const page = await context.newPage();
    const upstreamRequests = [];
    page.on('request',request => {if (request.url().includes('/api/image-proxy')) upstreamRequests.push(request.url());});
    await page.goto('http://localhost:3000/zh/create');
    await openHistory(page);
    await page.waitForFunction(() => window.__releaseCachedImages.length === 2);
    const pending = page.waitForEvent('download',{timeout:5000}).catch(() => null);
    let action = page.locator('[data-history-card]').getByRole('button',{name:'下载',exact:true});
    if (entryPoint === 'viewer') {
      await page.locator('[data-history-card]').getByRole('button',{name:'全屏查看',exact:true}).click();
      action = page.getByRole('dialog').getByRole('link',{name:'下载',exact:true});
    }
    await action.click();
    await page.evaluate(() => window.__releaseCachedImages.forEach(release => release()));
    const download = await pending;
    assert.ok(download, 'clicking before IndexedDB hydration finishes must still download the stored file');
    assert.equal(createHash('sha256').update(readFileSync(await download.path())).digest('hex'), createHash('sha256').update(artwork).digest('hex'));
    assert.deepEqual(upstreamRequests, []);
  } finally {await context.close(); await browser.close();}
  });
}

test('legacy histories backfill files, preserve shared images across tabs, and keep an open viewer alive during deletion', async () => {
  const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  const context = await browser.newContext({viewport:{width:1440,height:900}});
  try {
    const {errors} = await installCacheFixtures(context);
    const entries = [
      {...seed[0],id:'shared-first',images:[cacheSources[0]]},
      {...seed[1],id:'shared-second',images:[cacheSources[0]]},
      {...seed[2],id:'other-image',images:[cacheSources[1]]},
    ];
    await context.addInitScript(entries => {
      if (location.origin === 'http://localhost:3000' && !localStorage.getItem('op_create_history')) localStorage.setItem('op_create_history',JSON.stringify(entries));
    }, entries);
    const first = await context.newPage();
    await first.goto('http://localhost:3000/zh/create');
    await waitForCachedImages(first, 2);
    await openHistory(first);
    await first.locator('[data-history-card]').first().getByRole('button',{name:'全屏查看',exact:true}).click();
    const second = await context.newPage();
    await second.goto('http://localhost:3000/zh/create');
    await openHistory(second);
    await second.locator('[data-history-card]').first().getByRole('button',{name:'删除',exact:true}).click();
    await waitForCachedImages(second, 2);
    assert.equal(await second.locator('[data-history-card]').count(), 2);
    await second.locator('[data-history-card]').first().getByRole('button',{name:'删除',exact:true}).click();
    await waitForCachedImages(second, 1);
    await first.waitForFunction(() => document.querySelectorAll('[data-history-card]').length === 1);
    await assertArtworkDownload(first, first.getByRole('dialog').getByRole('link',{name:'下载',exact:true}), artwork);
    await first.keyboard.press('Escape');
    await second.locator('[data-history-card]').getByRole('button',{name:'删除',exact:true}).click();
    await waitForCachedImages(second, 0);
    assert.deepEqual(errors, []);
  } finally {await context.close(); await browser.close();}
});

test('the 30-entry limit discards only the evicted image file, not retained shared images', async () => {
  const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  const context = await browser.newContext({viewport:{width:1440,height:900}});
  try {
    const {errors} = await installCacheFixtures(context);
    const entries = Array.from({length:30}, (_, index) => ({...seed[0],id:`capped-${index}`,providerJobId:`capped-job-${index}`,images:[cacheSources[index === 29 ? 1 : 0]]}));
    await context.addInitScript(entries => {
      if (location.origin === 'http://localhost:3000' && !localStorage.getItem('op_create_history')) localStorage.setItem('op_create_history',JSON.stringify(entries));
    }, entries);
    await context.route('**/api/generations/cache-job', route => route.fulfill({json:{status:'succeeded',images:[cacheSources[0]]}}));
    const page = await context.newPage();
    await page.goto('http://localhost:3000/zh/create');
    await waitForCachedImages(page, 2);
    const controls = page.locator('[data-create-controls] select:visible');
    await controls.first().selectOption('GPT Image 2');
    await controls.nth(1).selectOption('1:1');
    await controls.nth(3).selectOption('2k');
    await page.locator('#op-create-prompt:visible').fill('第三十一条保留共享原图');
    await page.locator('[data-create-generate]:visible').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('op_create_history'))[0].prompt === '第三十一条保留共享原图');
    await waitForCachedImages(page, 1);
    const retained = await page.evaluate(() => JSON.parse(localStorage.getItem('op_create_history')));
    assert.equal(retained.length, 30);
    assert.ok(!retained.some(entry => entry.id === 'capped-29'));
    assert.deepEqual(errors, []);
  } finally {await context.close(); await browser.close();}
});

test('corrupted cached image is replaced with a decodable original and stays usable after its link expires', async () => {
  const browser = await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE});
  const context = await browser.newContext({viewport:{width:390,height:900}});
  try {
    const {errors,sourceRequests} = await installCacheFixtures(context);
    await context.addInitScript(entry => {
      if (location.origin === 'http://localhost:3000' && !localStorage.getItem('op_create_history')) localStorage.setItem('op_create_history',JSON.stringify([entry]));
    }, {...seed[0],images:cacheSources});
    const page = await context.newPage();
    await page.goto('http://localhost:3000/zh/create');
    await waitForCachedImages(page, 2);
    await page.evaluate(({name,source}) => new Promise(resolve => {
      const request = indexedDB.open(name);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction('images','readwrite');
        transaction.objectStore('images').put(new Blob(['not an image'],{type:'image/jpeg'}),source);
        transaction.oncomplete = () => {database.close(); resolve();};
      };
    }), {name:cacheDatabase,source:cacheSources[0]});
    const previousRequests = sourceRequests.length;
    await page.reload();
    await openHistory(page);
    await page.waitForFunction(() => {
      const image = document.querySelector('[data-history-card] img');
      return image?.src.startsWith('blob:') && image.complete && image.naturalWidth > 1;
    });
    assert.equal(sourceRequests.length, previousRequests + 1, 'only the damaged image is fetched again');
    await context.route('**/api/image-proxy*', route => route.fulfill({status:410,body:'expired'}));
    await page.reload();
    await openHistory(page);
    await page.waitForFunction(() => {
      const image = document.querySelector('[data-history-card] img');
      return image?.src.startsWith('blob:') && image.complete && image.naturalWidth > 1;
    });
    await assertArtworkDownload(page, page.locator('[data-history-card]').getByRole('button',{name:'下载',exact:true}), artwork);
    await page.screenshot({path:'/tmp/create-history-cache-mobile.png'});
    assert.deepEqual(errors, []);
  } finally {await context.close(); await browser.close();}
});

test('old history without a stored ratio still displays its natural image and opens fullscreen', async () => {
  const { browser, context, errors } = await setup(1440);
  try {
    await context.addInitScript(entry => {
      if (location.origin === 'http://localhost:3000') localStorage.setItem('op_create_history', JSON.stringify([entry]));
    }, { ...seed[1], aspectRatio: '' });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/zh/create', { waitUntil: 'domcontentloaded' });
    await openHistory(page);
    await page.locator('[data-history-grid] [data-masonry-ready="true"]').waitFor();
    const thumbnail = page.locator('[data-history-card]').getByRole('button', { name: '全屏查看', exact: true });
    assert.ok((await thumbnail.boundingBox()).height > 0, 'missing stored ratios cannot collapse the thumbnail');
    await page.waitForFunction(() => {
      const image = document.querySelector('[data-history-card] img');
      return image?.complete && image.naturalWidth > 0;
    });
    const image = await page.locator('[data-history-card] img').boundingBox();
    assert.ok(Math.abs(image.width / image.height - 2 / 3) < 0.01, 'natural portrait dimensions override the fallback ratio');
    await thumbnail.click();
    await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    assert.deepEqual(errors, []);
  } finally { await context.close(); await browser.close(); }
});

test('denied storage access does not crash the creation workspace', async () => {
  const { browser, context, errors } = await setup(1440);
  try {
    await context.addInitScript(() => {
      if (location.origin === 'http://localhost:3000') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Storage denied', 'SecurityError'); } });
    });
    const page = await context.newPage();
    await page.goto('http://localhost:3000/zh/create');
    await page.locator('#op-create-prompt:visible').fill('无存储的提示词');
    await openHistory(page);
    assert.equal(await page.locator('[data-history-card]').count(), 0);
    assert.deepEqual(errors, []);
  } finally { await context.close(); await browser.close(); }
});

test('two open tabs preserve both generation histories and synchronize deletion', async () => {
  const { browser, context, errors } = await setup(1440);
  try {
    const first = await context.newPage();
    const second = await context.newPage();
    await Promise.all([first.goto('http://localhost:3000/zh/create'), second.goto('http://localhost:3000/zh/create')]);
    await Promise.all([[first, '第一标签生成'], [second, '第二标签生成']].map(async ([page, prompt]) => {
      const controls = page.locator('[data-create-controls] select:visible');
      await controls.first().selectOption('GPT Image 2');
      await controls.nth(1).selectOption('1:1');
      await controls.nth(3).selectOption('2k');
      await page.locator('#op-create-prompt:visible').fill(prompt);
      await page.locator('[data-create-generate]:visible').click();
      await page.waitForFunction(expected => JSON.parse(localStorage.getItem('op_create_history') || '[]').some(entry => entry.prompt === expected), prompt, { timeout: 10000 });
    }));
    for (const page of [first, second]) {
      await openHistory(page);
      await page.waitForFunction(() => document.querySelectorAll('[data-history-card]').length === 2);
    }
    await second.evaluate(() => new Promise(resolve => {
      const entries = JSON.parse(localStorage.getItem('op_create_history'));
      window.dispatchEvent(new StorageEvent('storage', { key: 'op_create_history', newValue: JSON.stringify(entries.slice(1)), storageArea: localStorage }));
      requestAnimationFrame(() => resolve());
    }));
    assert.equal(await second.locator('[data-history-card]').count(), 2, 'a late storage event must read the latest storage, not its stale payload');
    await first.locator('[data-history-card]').first().getByRole('button', { name: '删除', exact: true }).click();
    await second.waitForFunction(() => document.querySelectorAll('[data-history-card]').length === 1);
    await second.reload();
    await openHistory(second);
    assert.equal(await second.locator('[data-history-card]').count(), 1);
    assert.deepEqual(errors, []);
  } finally { await context.close(); await browser.close(); }
});
