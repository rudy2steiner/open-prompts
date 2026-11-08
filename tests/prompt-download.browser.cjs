const {test} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const {readFileSync, writeFileSync} = require('node:fs');
const base = 'http://localhost:3000';
const zh = require('../messages/zh.json').OpenPrompts;
const artwork = readFileSync('public/local_images/gpt-image2-prompts/98_high-tech-lab-combat-scene.jpg');
const secondArtwork = readFileSync('public/local_images/gpt-image2-prompts/97_bold-cinematic-fitness-strength-campaign.jpg');
const image = async source => ({bytes:source.includes('two')?secondArtwork:artwork,contentType:'image/jpeg',extension:'jpg'});
const records = [
  {id:'saved',title:'Saved artwork',description:'Original description',prompt:'Full prompt\n第二行 </script><script>window.attacked=true</script>',model:'GPT Image 2',tags:['portrait'],authorHandle:'artist',images:['/local_images/one.png','/local_images/two.png']},
  {id:'new',title:'New artwork',description:'Second description',prompt:'Second complete prompt',model:'GPT Image 2',tags:['design'],images:['/local_images/three.png']},
];
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

test('English download API exists and still requires an entitled identity', async () => {
  const response = await fetch(`${base}/api/prompts/download`, {redirect:'manual'});
  assert.equal(response.status, 402);
  assert.equal((await response.json()).error, 'plan_required');
});

async function openChooser(page, locale='zh') {
  const labels = require(`../messages/${locale}.json`).OpenPrompts;
  await page.setExtraHTTPHeaders({'accept-language':locale});
  await page.context().addCookies([{name:'NEXT_LOCALE',value:locale,url:base}]);
  await page.route('**/api/auth/session', route => route.fulfill({json:{user:{id:'browser-fixture',name:'Fixture',email:'fixture@example.invalid'},expires:'2099-01-01T00:00:00Z'}}));
  await page.route('**/api/prompts/download', async route => {
    if (route.request().method() !== 'GET') return route.continue();
    await route.fulfill({json:{limit:2,taken:['saved'],items:records.map(item=>({id:item.id,title:item.title,model:item.model,previewSrc:item.images[0],imageCount:item.images.length}))}});
  });
  await page.route('**/*', route => {
    if (/\/api\/(generate|generations|upload)/.test(route.request().url())) throw new Error('Generation/upload request forbidden');
    if (route.request().resourceType() === 'image') return route.fulfill({body:artwork,contentType:'image/jpeg'});
    return route.fallback();
  });
  await page.goto(`${base}${locale==='en'?'':`/${locale}`}/image-prompts`);
  await page.getByRole('button',{name:labels.header.userMenu,exact:true}).click();
  await page.getByRole('menuitem',{name:labels.gallery.batchDownload,exact:true}).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByText('New artwork',{exact:true}).waitFor();
  return {dialog,labels};
}

test('download chooser shows image previews and formats without changing saved/new selection rules', async () => {
  const browser = await chromium.launch({executablePath,headless:true});
  try {
    for (const width of [390,1440]) {
      const page = await browser.newPage({viewport:{width,height:950}});
      const {dialog,labels} = await openChooser(page);
      assert.equal(await dialog.locator('img').count(), 2);
      assert.equal(await dialog.locator('img').first().getAttribute('alt'), 'Saved artwork');
      await dialog.getByText('2', {exact:true}).waitFor();
      assert.equal(await dialog.getByRole('radio',{name:labels.gallery.downloadHtml}).isChecked(), true);
      await dialog.getByRole('radio',{name:labels.gallery.downloadZip}).check();
      assert.equal(await dialog.getByRole('radio',{name:labels.gallery.downloadZip}).isChecked(), true);
      await dialog.locator('label').filter({hasText:'Saved artwork'}).getByRole('checkbox').check();
      await dialog.locator('label').filter({hasText:'New artwork'}).getByRole('checkbox').check();
      assert.ok((await dialog.innerText()).includes(labels.gallery.downloadNew.replace('{count}','1')));
      const bounds = await dialog.boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width);
      await dialog.screenshot({path:`/tmp/prompt-download-chooser-${width}.png`});
      await page.close();
    }
  } finally {await browser.close();}
});

test('download previews and format controls render in every supported language', async () => {
  const browser = await chromium.launch({executablePath,headless:true});
  try {
    for (const locale of ['en','zh','ja','ko','fr','de','es','pt']) {
      const page = await browser.newPage({viewport:{width:390,height:950}});
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      const {dialog,labels} = await openChooser(page,locale);
      assert.equal(await dialog.locator('img').count(),2,locale);
      assert.equal(await dialog.getByRole('radio',{name:labels.gallery.downloadHtml,exact:true}).isChecked(),true,locale);
      await dialog.getByText(labels.gallery.downloadHtmlHint,{exact:true}).waitFor();
      await dialog.getByRole('radio',{name:labels.gallery.downloadZip,exact:true}).check();
      await dialog.getByText(labels.gallery.downloadZipHint,{exact:true}).waitFor();
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),locale);
      assert.deepEqual(errors,[],locale);
      await page.close();
    }
  } finally {await browser.close();}
});

test('chooser submits the optional link-only mode and preserves full prompts in its HTML download', async () => {
  require('tsx/cjs');
  const {createPromptDownload} = require('../src/lib/prompts/prompt-download.ts');
  const browser = await chromium.launch({executablePath,headless:true});
  try {
    const page = await browser.newPage({viewport:{width:390,height:950},acceptDownloads:true});
    const {dialog,labels} = await openChooser(page);
    assert.equal(await dialog.getByRole('radio',{name:labels.gallery.downloadImagesEmbedded,exact:true}).isChecked(),true);
    await dialog.getByRole('radio',{name:labels.gallery.downloadImagesLinks,exact:true}).check();
    await page.route('**/api/prompts/download',async route=>{
      if(route.request().method()!=='POST') return route.fallback();
      const body = route.request().postDataJSON();
      assert.deepEqual(body,{ids:['new'],format:'html',imageMode:'links'});
      const response = await createPromptDownload({items:[records[1]],format:body.format,imageMode:body.imageMode,origin:base,locale:'zh',messages:require('../messages/zh.json'),assets:JSON.parse(readFileSync('src/lib/prompts/download-assets.json','utf8')),
        loadImage:async()=>{assert.fail('Link-only packaging must not fetch originals');},onComplete:async()=>{}});
      await route.fulfill({status:200,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
    });
    await dialog.locator('label').filter({hasText:'New artwork'}).getByRole('checkbox').check();
    const downloaded = page.waitForEvent('download');
    await dialog.getByRole('button',{name:labels.gallery.downloadAction,exact:true}).click();
    const file = await downloaded;
    await file.saveAs('/tmp/prompt-download-links.html');
    const data = JSON.parse(readFileSync('/tmp/prompt-download-links.html','utf8').match(/<script id="prompt-download-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(data.imageMode,'links');
    assert.equal(data.items[0].prompt,'Second complete prompt');
    assert.deepEqual(data.items[0].images,[`${base}/local_images/three.png`]);
    await dialog.waitFor({state:'hidden'});
  } finally {await browser.close();}
});

test('chooser downloads real HTML/ZIP archives and reports failed packaging instead of closing', async () => {
  require('tsx/cjs');
  const {createPromptDownload} = require('../src/lib/prompts/prompt-download.ts');
  const assets = JSON.parse(readFileSync('src/lib/prompts/download-assets.json','utf8'));
  const browser = await chromium.launch({executablePath,headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
    const {dialog,labels} = await openChooser(page);
    let completed = 0;
    let fail = false;
    await page.route('**/api/prompts/download', async route => {
      if (route.request().method() !== 'POST') return route.fallback();
      if (fail) return route.fulfill({status:502,json:{error:'image_download_failed'}});
      const body = route.request().postDataJSON();
      assert.deepEqual(body.ids,['saved','new']);
      const response = await createPromptDownload({items:records,format:body.format,locale:'zh',messages:require('../messages/zh.json'),assets,
        loadImage:image,onComplete:async()=>{completed++;}});
      await route.fulfill({status:200,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
    });
    for (const format of ['html','zip']) {
      if (format==='zip') {
        const loaded = page.waitForResponse(response => response.url().endsWith('/api/prompts/download') && response.request().method() === 'GET');
        await page.getByRole('button',{name:labels.header.userMenu,exact:true}).click();
        await page.getByRole('menuitem',{name:labels.gallery.batchDownload,exact:true}).click();
        await loaded;
        await dialog.getByText('New artwork',{exact:true}).waitFor();
      }
      await dialog.getByRole('radio',{name:format==='html'?labels.gallery.downloadHtml:labels.gallery.downloadZip}).check();
      await dialog.locator('label').filter({hasText:'Saved artwork'}).getByRole('checkbox').check();
      await dialog.locator('label').filter({hasText:'New artwork'}).getByRole('checkbox').check();
      const download = page.waitForEvent('download');
      await dialog.getByRole('button',{name:labels.gallery.downloadAction,exact:true}).click();
      const file = await download;
      assert.equal(file.suggestedFilename(),`open-prompts.${format}`);
      await file.saveAs(`/tmp/prompt-download.${format}`);
      await dialog.waitFor({state:'hidden'});
    }
    assert.equal(completed,2);
    fail = true;
    const loaded = page.waitForResponse(response => response.url().endsWith('/api/prompts/download') && response.request().method() === 'GET');
    await page.getByRole('button',{name:labels.header.userMenu,exact:true}).click();
    await page.getByRole('menuitem',{name:labels.gallery.batchDownload,exact:true}).click();
    await loaded;
    await dialog.getByText('New artwork',{exact:true}).waitFor();
    await dialog.locator('label').filter({hasText:'New artwork'}).getByRole('checkbox').check();
    await dialog.getByRole('button',{name:labels.gallery.downloadAction,exact:true}).click();
    await dialog.getByRole('alert').waitFor();
    assert.ok(await dialog.isVisible());
    assert.equal(completed,2);
  } finally {await browser.close();}
});

test('closing the chooser aborts an in-flight archive instead of saving it after closure', async () => {
  const browser = await chromium.launch({executablePath,headless:true});
  try {
    const page = await browser.newPage();
    const {dialog,labels} = await openChooser(page);
    let release;
    const held = new Promise(resolve=>{release=resolve;});
    await page.route('**/api/prompts/download', async route=>{
      if (route.request().method()!=='POST') return route.fallback();
      await held;
      await route.fulfill({body:'late archive',contentType:'application/zip'}).catch(()=>{});
    });
    await dialog.locator('label').filter({hasText:'New artwork'}).getByRole('checkbox').check();
    const request=page.waitForRequest(request=>request.url().endsWith('/api/prompts/download')&&request.method()==='POST');
    await dialog.getByRole('button',{name:labels.gallery.downloadAction,exact:true}).click();
    await request;
    const aborted=page.waitForEvent('requestfailed',{predicate:request=>request.url().endsWith('/api/prompts/download'),timeout:2500});
    await dialog.getByRole('button',{name:labels.gallery.downloadClose,exact:true}).click();
    try {await aborted;} finally {release();}
    assert.ok(!await dialog.isVisible());
  } finally {await browser.close();}
});

async function linkedHtml(file) {
  require('tsx/cjs');
  const {createPromptDownload} = require('../src/lib/prompts/prompt-download.ts');
  const response = await createPromptDownload({items:records,format:'html',imageMode:'links',origin:base,locale:'zh',messages:require('../messages/zh.json'),assets:JSON.parse(readFileSync('src/lib/prompts/download-assets.json','utf8')),
    loadImage:async()=>{assert.fail('Link-only files must not fetch originals during export');},onComplete:async()=>{}});
  writeFileSync(file,Buffer.from(await response.arrayBuffer()));
}

test('linked HTML caches each original once and reopens online or offline without image requests', async () => {
  const file='/tmp/prompt-download-cache.html';
  await linkedHtml(file);
  const browser=await chromium.launch({executablePath,headless:true});
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000}});
    let requests=0;
    context.on('request',request=>{if(/^https?:/.test(request.url())) requests++;});
    await context.route('**/local_images/*',route=>route.fulfill({body:artwork,contentType:'image/jpeg',headers:{'access-control-allow-origin':'*'}}));
    let page=await context.newPage();
    const complete=zh.gallery.downloadCacheComplete.replace('{count}','3').replace('{total}','3');
    await page.goto(`file://${file}`);
    await page.getByRole('status').getByText(complete,{exact:true}).waitFor({timeout:5000});
    assert.equal(requests,3,'Initial load should not fetch again through image elements');
    await page.locator('[data-gallery-item] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    assert.ok(await page.locator('[data-gallery-item] img').evaluateAll(images=>images.every(image=>image.src.startsWith('blob:'))));
    await page.screenshot({path:'/tmp/prompt-download-cache-online.png'});
    await page.close();
    page=await context.newPage();
    await page.goto(`file://${file}`);
    await page.getByRole('status').getByText(complete,{exact:true}).waitFor({timeout:5000});
    assert.equal(requests,3,'Reopening online must read the persisted cache');
    await page.close();
    await context.setOffline(true);
    page=await context.newPage();
    await page.goto(`file://${file}`);
    await page.getByRole('status').getByText(complete,{exact:true}).waitFor({timeout:5000});
    assert.equal(requests,3,'Offline reopening must not attempt to request cached images');
    await page.locator('[data-gallery-item] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    await page.locator('[data-gallery-item]').first().getByRole('link',{name:'Saved artwork',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.locator('#op-template-detail-title').waitFor();
    assert.equal(await page.locator('.whitespace-pre-wrap').textContent(),records[0].prompt);
    await page.getByRole('button',{name:'Saved artwork',exact:true}).first().click();
    const viewer=page.locator('[role="dialog"]');
    await viewer.waitFor();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(()=>document.body.textContent.includes('2 / 2'));
    await viewer.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    await page.keyboard.press('Escape');
    await viewer.waitFor({state:'hidden'});
    await page.setViewportSize({width:390,height:900});
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:'/tmp/prompt-download-cache-offline-mobile.png'});
  } finally {await browser.close();}
});

test('linked HTML repairs invalid or oversized cached originals before reporting offline availability', async (t) => {
  const file='/tmp/prompt-download-cache-repair.html';
  await linkedHtml(file);
  const browser=await chromium.launch({executablePath,headless:true});
  try {
    for(const failure of ['invalid','oversized']) await t.test(failure,async () => {
      const context=await browser.newContext();
      let requests=0;
      context.on('request',request=>{if(/^https?:/.test(request.url())) requests++;});
      await context.route('**/local_images/*',route=>route.fulfill({body:artwork,contentType:'image/jpeg',headers:{'access-control-allow-origin':'*'}}));
      let page=await context.newPage();
      const complete=zh.gallery.downloadCacheComplete.replace('{count}','3').replace('{total}','3');
      await page.goto(`file://${file}`);
      await page.getByRole('status').getByText(complete,{exact:true}).waitFor({timeout:5000});
      assert.equal(requests,3,failure);
      await page.evaluate(async ({failure,bytes,source})=>{
        const blob=failure==='invalid'?new Blob(['not an image'],{type:'image/jpeg'}):new Blob([new Uint8Array(bytes),new Uint8Array(21*1024*1024-bytes.length)],{type:'image/jpeg'});
        if(failure==='oversized') {const bitmap=await createImageBitmap(blob);bitmap.close();}
        const database=await new Promise((resolve,reject)=>{
          const request=indexedDB.open('open-prompts-images',1);
          request.onsuccess=()=>resolve(request.result);
          request.onerror=()=>reject(request.error);
        });
        try {
          await new Promise((resolve,reject)=>{
            const transaction=database.transaction('images','readwrite');
            transaction.oncomplete=resolve;
            transaction.onerror=transaction.onabort=()=>reject(transaction.error);
            transaction.objectStore('images').put(blob,source);
          });
        } finally {database.close();}
      },{failure,bytes:Array.from(artwork),source:`${base}/local_images/one.png`});
      await page.close();
      page=await context.newPage();
      await page.goto(`file://${file}`);
      await page.getByRole('status').getByText(complete,{exact:true}).waitFor({timeout:5000});
      assert.equal(requests,4,'Only the invalid cached original must be downloaded again');
      await page.locator('[data-gallery-item] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
      await page.close();
      await context.setOffline(true);
      page=await context.newPage();
      await page.goto(`file://${file}`);
      await page.getByRole('status').getByText(complete,{exact:true}).waitFor({timeout:5000});
      assert.equal(requests,4,'The repaired cache must be reused offline');
      await page.locator('[data-gallery-item] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
      await context.close();
    });
  } finally {await browser.close();}
});

test('linked HTML reports uncached images instead of claiming complete offline availability', async () => {
  const file='/tmp/prompt-download-cache-failure.html';
  await linkedHtml(file);
  const browser=await chromium.launch({executablePath,headless:true});
  try {
    for(const failure of ['http','invalid','oversized']) {
      const context=await browser.newContext();
      await context.route('**/local_images/*',route=>{
        if(route.request().url().includes('two')) return route.fulfill({status:failure==='http'?404:200,body:failure==='invalid'?'<html><script>window.attacked=true</script></html>':artwork,contentType:'image/jpeg',headers:{'access-control-allow-origin':'*',...(failure==='oversized'?{'content-length':String(21*1024*1024)}:{})}});
        return route.fulfill({body:artwork,contentType:'image/jpeg',headers:{'access-control-allow-origin':'*'}});
      });
      const page=await context.newPage();
      await page.goto(`file://${file}`);
      await page.getByRole('status').getByText(zh.gallery.downloadCacheIncomplete.replace('{count}','1'),{exact:true}).waitFor({timeout:5000});
      assert.equal(await page.getByText(zh.gallery.downloadCacheComplete.replace('{count}','3').replace('{total}','3'),{exact:true}).count(),0,failure);
      assert.equal(await page.evaluate(()=>window.attacked),undefined);
      assert.equal(await page.locator('[data-gallery-item]').count(),2);
      await context.close();
    }
  } finally {await browser.close();}
});

test('linked HTML remains browsable when persistent storage is unavailable or full', async () => {
  const file='/tmp/prompt-download-cache-storage.html';
  await linkedHtml(file);
  const browser=await chromium.launch({executablePath,headless:true});
  try {
    for(const failure of ['unavailable','full']) {
      const context=await browser.newContext();
      await context.addInitScript(failure=>{
        if(failure==='unavailable') Object.defineProperty(window,'indexedDB',{get(){throw new DOMException('Storage blocked','SecurityError');}});
        else IDBObjectStore.prototype.put=function(){throw new DOMException('Storage full','QuotaExceededError');};
      },failure);
      await context.route('**/local_images/*',route=>route.fulfill({body:artwork,contentType:'image/jpeg',headers:{'access-control-allow-origin':'*'}}));
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.goto(`file://${file}`);
      await page.getByRole('status').getByText(zh.gallery.downloadCacheUnavailable,{exact:true}).waitFor({timeout:5000});
      await page.waitForFunction(()=>Array.from(document.querySelectorAll('[data-gallery-item] img')).every(image=>image.src.startsWith('blob:')));
      await page.locator('[data-gallery-item] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
      assert.deepEqual(errors,[],failure);
      await context.close();
    }
  } finally {await browser.close();}
});

test('exported HTML uses the real gallery offline, including detail, full prompt copy and multi-image keyboard viewing', async () => {
  require('tsx/cjs');
  const {createPromptDownload} = require('../src/lib/prompts/prompt-download.ts');
  const response = await createPromptDownload({items:records,format:'html',locale:'zh',messages:require('../messages/zh.json'),assets:JSON.parse(readFileSync('src/lib/prompts/download-assets.json','utf8')),loadImage:image,onComplete:async()=>{}});
  writeFileSync('/tmp/prompt-download-offline.html',Buffer.from(await response.arrayBuffer()));
  const browser = await chromium.launch({executablePath,headless:true});
  try {
    const context = await browser.newContext({viewport:{width:1440,height:1000},offline:true});
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror', error=>errors.push(error.message));
    await page.addInitScript(()=>{Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copiedPrompt=text;}}});});
    await page.goto('file:///tmp/prompt-download-offline.html');
    await page.locator('[data-gallery-item]').first().waitFor();
    assert.equal(await page.locator('[data-gallery-item]').count(),2);
    await page.locator('[data-gallery-item] img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
    assert.equal(await page.evaluate(()=>window.attacked),undefined);
    const card=page.locator('[data-gallery-item]').first();
    assert.equal(await card.locator('.rounded-2xl').first().evaluate(el=>getComputedStyle(el).borderRadius),'16px');
    await page.screenshot({path:'/tmp/prompt-download-offline-gallery.png',fullPage:true});
    const search = page.getByRole('textbox',{name:zh.gallery.downloadSearch,exact:true});
    await search.fill('Second complete prompt');
    await page.waitForFunction(()=>document.querySelectorAll('[data-gallery-item]').length===1);
    assert.ok((await page.locator('[data-gallery-item]').innerText()).includes('New artwork'));
    await search.fill('');
    await page.waitForFunction(()=>document.querySelectorAll('[data-gallery-item]').length===2);
    await page.getByRole('button',{name:zh.header.themeToggle,exact:true}).click();
    assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    await page.getByRole('button',{name:zh.header.themeToggle,exact:true}).click();
    await card.getByRole('link',{name:'Saved artwork',exact:true}).focus();
    await page.keyboard.press('Enter');
    await page.locator('#op-template-detail-title').waitFor();
    assert.equal(await page.locator('.whitespace-pre-wrap').textContent(),records[0].prompt);
    await page.getByRole('button',{name:zh.modal.copy,exact:true}).click();
    assert.equal(await page.evaluate(()=>window.copiedPrompt),records[0].prompt);
    await page.getByRole('button',{name:'Saved artwork',exact:true}).first().click();
    const viewer=page.locator('[role="dialog"]');
    await viewer.waitFor();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(()=>document.body.textContent.includes('2 / 2'));
    await page.keyboard.press('Escape');
    await viewer.waitFor({state:'hidden'});
    await page.screenshot({path:'/tmp/prompt-download-offline-detail.png',fullPage:true});
    await page.setViewportSize({width:390,height:900});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:'/tmp/prompt-download-offline-detail-390.png',fullPage:true});
    assert.deepEqual(errors,[]);
  } finally {await browser.close();}
});
