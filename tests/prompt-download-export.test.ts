import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PromptGalleryItem } from '../src/data/promptGallery';
import { applyDownloadQuota } from '../src/lib/prompts/batch-download';

const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==', 'base64'));
const item: PromptGalleryItem = {
  id: '../../sample', title: '作品 / example', description: 'Description',
  prompt: 'Full prompt\n第二行 </script><script>window.attacked=true</script>',
  model: 'GPT Image 2', tags: ['portrait'], authorHandle: '@artist',
  sourceUrl: 'https://example.com/original', createdAt: '2026-11-08T00:00:00Z',
  images: ['/local_images/one.png', '/local_images/two.png'],
};

async function feature() {
  try { return await import('../src/lib/prompts/prompt-download'); }
  catch (error) {
    if ((error as {code?: string}).code === 'ERR_MODULE_NOT_FOUND' || (error as {code?: string}).code === 'MODULE_NOT_FOUND') {
      assert.fail('HTML/ZIP prompt export is not implemented');
    }
    throw error;
  }
}
const image = async () => ({ bytes: png, contentType: 'image/png', extension: 'png' });
const assets = { css: 'body{margin:0}', js: 'window.exportReady=true' };

function unzipStored(bytes: Uint8Array) {
  const data = Buffer.from(bytes);
  const entries = new Map<string, Buffer>();
  const end = data.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, 'ZIP has an end-of-central-directory record');
  let central = data.readUInt32LE(end + 16);
  for (let n = 0; n < data.readUInt16LE(end + 10); n++) {
    assert.equal(data.readUInt32LE(central), 0x02014b50);
    assert.equal(data.readUInt16LE(central + 10), 0);
    const size = data.readUInt32LE(central + 24);
    const nameLength = data.readUInt16LE(central + 28);
    const name = data.subarray(central + 46, central + 46 + nameLength).toString('utf8');
    const local = data.readUInt32LE(central + 42);
    assert.equal(data.readUInt32LE(local), 0x04034b50);
    const start = local + 30 + data.readUInt16LE(local + 26) + data.readUInt16LE(local + 28);
    entries.set(name, data.subarray(start, start + size));
    central += 46 + nameLength + data.readUInt16LE(central + 30) + data.readUInt16LE(central + 32);
  }
  return entries;
}

test('ZIP keeps every original image and the exact full prompt together in a safe unique folder', async () => {
  const { createPromptDownload } = await feature();
  const response = await createPromptDownload({ items: [item, { ...item, id: 'other', images: [] }], format: 'zip', locale: 'zh', messages: {}, assets, loadImage: image, onComplete: async () => {} });
  assert.equal(response.headers.get('content-type'), 'application/zip');
  const entries = unzipStored(new Uint8Array(await response.arrayBuffer()));
  assert.equal(entries.size, 4);
  const prompts = Array.from(entries).filter(([name]) => name.endsWith('/prompt.txt'));
  assert.equal(prompts.length, 2);
  assert.notEqual(prompts[0]![0], prompts[1]![0]);
  for (const [name, bytes] of Array.from(entries)) {
    assert.ok(!name.startsWith('/') && !name.split('/').includes('..'));
    assert.equal(name.split('/').length, 2);
    if (name.endsWith('prompt.txt')) assert.equal(bytes.toString('utf8'), item.prompt);
    else assert.deepEqual(new Uint8Array(bytes), png);
  }
  assert.ok(Array.from(entries.keys()).some(name => name.endsWith('/image-02.png')));
});

test('HTML embeds complete gallery records and all images without executable user markup', async () => {
  const { createPromptDownload } = await feature();
  const response = await createPromptDownload({ items: [item], format: 'html', locale: 'zh', messages: { title: '</script>' }, assets, loadImage: image, onComplete: async () => {} });
  assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
  const html = await response.text();
  const raw = html.match(/<script id="prompt-download-data" type="application\/json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(raw);
  const data = JSON.parse(raw);
  assert.equal(data.items[0].prompt, item.prompt);
  assert.equal(data.items[0].sourceUrl, item.sourceUrl);
  assert.equal(data.locale, 'zh');
  assert.deepEqual(data.items[0].images, [0, 1].map(() => `data:image/png;base64,${Buffer.from(png).toString('base64')}`));
  assert.ok(!raw.includes('<'));
  assert.ok(html.includes('<style>body{margin:0}</style>'));
  assert.ok(html.includes('window.exportReady=true'));
});

test('linked HTML preserves all prompts and absolute original URLs without downloading images', async () => {
  const {createPromptDownload} = await feature();
  const images = ['/local_images/one.jpg', 'https://pbs.twimg.com/media/HU23TzbbAAAgCLd.jpg?name=orig'];
  let completed = 0;
  const response = await createPromptDownload({items: [{...item, images}], format: 'html', imageMode: 'links', origin: 'https://www.open-prompts.com', locale: 'zh', messages: {}, assets,
    loadImage: async () => {assert.fail('Link-only exports must not fetch images');}, onComplete: async () => {completed++;},
  });
  const output = await response.text();
  const data = JSON.parse(output.match(/<script id="prompt-download-data" type="application\/json">([\s\S]*?)<\/script>/)![1]!);
  assert.equal(data.imageMode, 'links');
  assert.equal(data.items[0].prompt, item.prompt);
  assert.deepEqual(data.items[0].images, ['https://www.open-prompts.com/local_images/one.jpg', images[1]]);
  assert.equal(completed, 1);
});

test('linked ZIP contains prompt.txt and every original link in images.txt per template', async () => {
  const {createPromptDownload} = await feature();
  const response = await createPromptDownload({items: [item, {...item, id: 'empty', images: []}], format: 'zip', imageMode: 'links', origin: 'https://www.open-prompts.com', locale: 'zh', messages: {}, assets,
    loadImage: async () => {assert.fail('Link-only exports must not fetch images');}, onComplete: async () => {},
  });
  const entries = Array.from(unzipStored(new Uint8Array(await response.arrayBuffer())));
  assert.equal(entries.length, 4);
  assert.equal(entries.filter(([name]) => name.endsWith('prompt.txt')).length, 2);
  for (const [name, bytes] of entries) if (name.endsWith('prompt.txt')) assert.equal(bytes.toString(), item.prompt);
  const links = entries.filter(([name]) => name.endsWith('images.txt'));
  assert.equal(links[0]![1].toString(), 'https://www.open-prompts.com/local_images/one.png\nhttps://www.open-prompts.com/local_images/two.png\n');
  assert.equal(links[1]![1].length, 0);
});

test('link-only exports reject unsafe image links before acquiring quota', async () => {
  const {createPromptDownload} = await feature();
  for (const format of ['html', 'zip'] as const) {
    let completed = 0;
    await assert.rejects(createPromptDownload({items: [{...item, images: ['javascript:alert(1)']}], format, imageMode: 'links', origin: 'https://www.open-prompts.com', locale: 'en', messages: {}, assets,
      loadImage: async () => {assert.fail('Link-only exports must not fetch images');}, onComplete: async () => {completed++;},
    }), /Image host or path is not supported/);
    assert.equal(completed, 0);
  }
});

test('failed image packaging does not acquire new prompt quota or silently omit an image', async () => {
  const { createPromptDownload } = await feature();
  let acquired = 0;
  let calls = 0;
  const response = createPromptDownload({ items: [item], format: 'zip', locale: 'en', messages: {}, assets,
    loadImage: async () => { if (++calls === 2) throw new Error('image unavailable'); return image(); },
    onComplete: async () => { acquired++; },
  });
  await assert.rejects(async () => { await response; }, /image unavailable/);
  assert.equal(acquired, 0);
});

test('successful packaging acquires only new IDs, while downloading saved prompts preserves remaining quota', async () => {
  const { createPromptDownload } = await feature();
  const quota = applyDownloadQuota({ requestedIds: ['saved', 'new'], ownedIds: ['saved'], limit: 2 });
  const acquired: string[] = [];
  const response = await createPromptDownload({ items: [{ ...item, id: 'saved' }, { ...item, id: 'new' }], format: 'zip', locale: 'en', messages: {}, assets, loadImage: image,
    onComplete: async () => { acquired.push(...quota.newIds); },
  });
  assert.deepEqual(acquired, ['new']);
  await response.arrayBuffer();
  assert.deepEqual(acquired, ['new']);
  assert.equal(applyDownloadQuota({ requestedIds: ['saved', 'new'], ownedIds: ['saved', 'new'], limit: 2 }).exceeded, false);
});

test('oversized archives fail before acquiring quota or exposing a file', async () => {
  const {createPromptDownload} = await feature();
  let acquired = 0;
  const bytes = new Uint8Array(17 * 1024 * 1024);
  await assert.rejects(createPromptDownload({items: [item], format: 'zip', locale: 'en', messages: {}, assets,
    loadImage: async () => ({bytes, contentType: 'image/png', extension: 'png'}),
    onComplete: async () => {acquired++;},
  }), /32 MB/);
  assert.equal(acquired, 0);
});

test('cancelling image packaging returns no file and does not acquire fresh quota', async () => {
  const {createPromptDownload} = await feature();
  const controller = new AbortController();
  let acquired = 0;
  await assert.rejects(createPromptDownload({items: [item], format: 'html', locale: 'en', messages: {}, assets, signal: controller.signal,
    loadImage: async () => {controller.abort(); return image();},
    onComplete: async () => {acquired++;},
  }), {name: 'AbortError'});
  assert.equal(acquired, 0);
});

test('media fetching rejects private URLs, API paths, path traversal and unsafe redirects before fetching them', async () => {
  const { loadPromptDownloadImage } = await feature();
  let calls = 0;
  const fetcher: typeof fetch = async () => { calls++; return new Response(png, {headers: {'content-type': 'image/png'}}); };
  for (const source of ['http://127.0.0.1/image.png', 'https://[::1]/image.png', 'https://evil.example/image.png', '/api/image-proxy?url=http://localhost/', '/local_images/%2e%2e/api/image.png', '//evil.example/image.png']) {
    await assert.rejects(loadPromptDownloadImage(source, {origin: 'https://www.open-prompts.com', fetcher}));
  }
  assert.equal(calls, 0);
  let redirects = 0;
  await assert.rejects(loadPromptDownloadImage('https://pbs.twimg.com/media/image.png', {
    origin: 'https://www.open-prompts.com',
    fetcher: async () => { redirects++; return new Response(null, {status: 302, headers: {location: 'http://169.254.169.254/image.png'}}); },
  }));
  assert.equal(redirects, 1);
});

test('catalog video-cover images are included without altering their bytes in both HTML and ZIP', async () => {
  const {createPromptDownload, loadPromptDownloadImage} = await feature();
  const sources = [
    'https://pbs.twimg.com/amplify_video_thumb/2098933187846262784/img/UooDLUJnGhB-iPBY.jpg',
    'https://pbs.twimg.com/tweet_video_thumb/HShbRDqXwAAyQWU.jpg',
    'https://pbs.twimg.com/ext_tw_video_thumb/2056698446531497984/pu/img/_1zNhEZuzdvXcISu.jpg',
  ];
  for (const format of ['html', 'zip'] as const) {
    const fetched: string[] = [];
    let acquired = 0;
    const response = await createPromptDownload({items: [{...item, images: sources}], format, locale: 'zh', messages: {}, assets,
      loadImage: source => loadPromptDownloadImage(source, {origin: 'http://localhost:3000', fetcher: async url => {
        fetched.push(String(url));
        return new Response(png, {headers: {'content-type': 'image/png'}});
      }}),
      onComplete: async () => {acquired++;},
    });
    assert.deepEqual(fetched, sources);
    assert.equal(acquired, 1);
    if (format === 'html') {
      const data = JSON.parse((await response.text()).match(/<script id="prompt-download-data" type="application\/json">([\s\S]*?)<\/script>/)![1]!);
      assert.equal(data.items[0].prompt, item.prompt);
      assert.deepEqual(data.items[0].images, sources.map(() => `data:image/png;base64,${Buffer.from(png).toString('base64')}`));
    } else {
      const entries = unzipStored(new Uint8Array(await response.arrayBuffer()));
      assert.equal(entries.size, 4);
      for (const [name, bytes] of Array.from(entries)) {
        if (name.endsWith('prompt.txt')) assert.equal(bytes.toString('utf8'), item.prompt);
        else assert.deepEqual(new Uint8Array(bytes), png);
      }
    }
  }
});

test('video-cover image paths do not allow private redirects or unsafe image data', async () => {
  const {loadPromptDownloadImage} = await feature();
  const source = 'https://pbs.twimg.com/amplify_video_thumb/2098933187846262784/img/UooDLUJnGhB-iPBY.jpg';
  let calls = 0;
  await assert.rejects(loadPromptDownloadImage(source, {origin: 'http://localhost:3000', fetcher: async () => {
    calls++;
    return new Response(null, {status: 302, headers: {location: 'http://169.254.169.254/image.jpg'}});
  }}), /Image host or path is not supported/);
  assert.equal(calls, 1);
  await assert.rejects(loadPromptDownloadImage(source, {origin: 'http://localhost:3000', fetcher: async () => new Response('<html>not an image</html>')}), /Unsupported or invalid image data/);
});

test('media fetching preserves original PNG bytes and rejects HTML pretending to be an image', async () => {
  const { loadPromptDownloadImage } = await feature();
  const loaded = await loadPromptDownloadImage('/local_images/one.png', {origin: 'http://localhost:3000', fetcher: async () => new Response(png, {headers: {'content-type': 'image/png'}})});
  assert.deepEqual(loaded.bytes, png);
  assert.equal(loaded.extension, 'png');
  await assert.rejects(loadPromptDownloadImage('/local_images/one.png', {origin: 'http://localhost:3000', fetcher: async () => new Response('<html>blocked</html>', {headers: {'content-type': 'image/png'}})}));
});
