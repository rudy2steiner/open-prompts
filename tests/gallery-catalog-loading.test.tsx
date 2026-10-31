import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { useGalleryCatalog } from '../src/components/prompt-gallery/useGalleryCatalog';
import type { PromptGalleryItem } from '../src/data/promptGallery';
const card = (id: number): PromptGalleryItem => ({ id: String(id), title: String(id), description: '', prompt: '', images: [], tags: [], model: 'GPT Image 2' });
let latest: ReturnType<typeof useGalleryCatalog>;
function Harness({ filtered = false, dated = false }: { filtered?: boolean; dated?: boolean }) { latest = useGalleryCatalog(dated ? [{...card(0),createdAt:'2026-10-21T00:00:00Z'}, {...card(1),createdAt:'2026-10-20T00:00:00Z'}] : [card(0), card(1)], 6, false, !filtered); return null; }
async function mount(filtered = false, dated = false) { let tree!: ReactTestRenderer; await act(async () => { tree = create(<Harness filtered={filtered} dated={dated} />); }); return tree; }

test('default first paint does not download the complete search catalog', async () => {
  const original = global.fetch; const calls: string[] = [];
  global.fetch = (async url => { calls.push(String(url)); throw Error('unexpected request'); }) as typeof fetch;
  const tree = await mount();
  try { assert.deepEqual(calls, []); assert.equal(latest.prompts.length, 2); assert.equal(latest.nextOffset, 2); }
  finally { tree.unmount(); global.fetch = original; }
});
test('scroll appends a small preview page, preserves existing cards and stops at the end', async () => {
  const original = global.fetch; const calls: string[] = [];
  global.fetch = (async url => { calls.push(String(url)); return Response.json({ items: [card(2), card(3), card(4), card(5)], total: 6, nextOffset: null }); }) as typeof fetch;
  const tree = await mount();
  try {
    await act(async () => { assert.equal(await latest.loadNextPage(), true); });
    assert.deepEqual(calls, ['/api/gallery-bootstrap?offset=2']);
    assert.deepEqual(latest.prompts.map(p => p.id), ['0','1','2','3','4','5']);
    assert.equal(latest.catalogReady, false); assert.equal(latest.nextOffset, null);
    await act(async () => { assert.equal(await latest.loadNextPage(), false); });
    assert.equal(calls.length, 1);
  } finally { tree.unmount(); global.fetch = original; }
});
test('a failed preview page can retry without advancing the offset', async () => {
  const original = global.fetch; let attempts = 0;
  global.fetch = (async () => ++attempts === 1 ? new Response('', {status: 503}) : Response.json({ items: [card(2)], total: 6, nextOffset: 3 })) as typeof fetch;
  const tree = await mount();
  try {
    await act(async () => { assert.equal(await latest.loadNextPage(), false); });
    assert.equal(latest.error, true); assert.equal(latest.nextOffset, 2);
    await act(async () => { assert.equal(await latest.loadNextPage(), true); });
    assert.equal(latest.error, false); assert.equal(latest.nextOffset, 3);
  } finally { tree.unmount(); global.fetch = original; }
});
test('search cancels an in-flight preview and retains full prompt bodies', async () => {
  const original = global.fetch; let pageSignal: AbortSignal | null = null; const calls: string[] = [];
  global.fetch = ((url, init) => {
    calls.push(String(url));
    if (String(url).includes('gallery-bootstrap')) return new Promise((_resolve, reject) => {
      pageSignal = init?.signal as AbortSignal;
      pageSignal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')));
    });
    return Promise.resolve(Response.json({ prompts: [{...card(9), prompt: 'searchable full body'}] }));
  }) as typeof fetch;
  const tree = await mount();
  try {
    let page!: Promise<boolean>;
    await act(async () => { page = latest.loadNextPage(); });
    await act(async () => { assert.equal(await latest.ensureCatalog(), true); });
    assert.equal(await page, false); assert.equal(pageSignal!.aborted, true);
    assert.deepEqual(calls, ['/api/gallery-bootstrap?offset=2', '/api/prompts']);
    assert.equal(latest.catalogReady, true); assert.equal(latest.prompts[0].prompt, 'searchable full body');
  } finally { tree.unmount(); global.fetch = original; }
});

test('a filtered initial page cannot be mixed with an unfiltered offset page after clearing filters', async () => {
  const original = global.fetch; const calls: string[] = [];
  global.fetch = (async url => { calls.push(String(url)); return String(url).includes('gallery-bootstrap') ? Response.json({items: [card(9)], total: 6, nextOffset: 3}) : Response.json({prompts: [card(4), card(5)]}); }) as typeof fetch;
  const tree = await mount(true);
  try {
    await act(async () => { assert.equal(await latest.loadNextPage(), true); });
    assert.deepEqual(calls, ['/api/prompts']);
    assert.equal(latest.catalogReady, true);
    assert.deepEqual(latest.prompts.map(item => item.id), ['4', '5']);
  } finally { tree.unmount(); global.fetch = original; }
});

test('newer records arriving during pagination still leave the feed in date-descending order', async () => {
  const original = global.fetch;
  global.fetch = (async () => Response.json({items:[{...card(2),createdAt:'2026-10-22T00:00:00Z'},{...card(3),createdAt:'2026-10-19T00:00:00Z'}],total:6,nextOffset:4})) as typeof fetch;
  const tree = await mount(false, true);
  try {
    await act(async () => { await latest.loadNextPage(); });
    assert.deepEqual(latest.prompts.map(item=>item.id), ['2','0','1','3']);
  } finally { tree.unmount(); global.fetch=original; }
});
