import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { serveGalleryHtml } from '../src/lib/cloudflare/gallery-html-cache';

function setup() {
  const entries = new Map<string, Response>();
  const pending: Promise<unknown>[] = [];
  const cache = {
    async match(r: Request) { return entries.get(r.url)?.clone(); },
    async put(r: Request, response: Response) { entries.set(r.url, response.clone()); },
  };
  const ctx = { waitUntil(p: Promise<unknown>) { pending.push(p); } };
  return { cache, ctx, pending, entries };
}
const request = (path = '/image-prompts', headers: HeadersInit = {}) => new Request(`https://www.open-prompts.com${path}`, { headers });
const html = () => new Response('<h1>Public gallery</h1>', { headers: {
  'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store',
  'Set-Cookie': 'NEXT_LOCALE=en; Path=/; SameSite=lax',
} });

test('anonymous HTML hits avoid rendering, preserve locale cookie and isolate builds/language', async () => {
  const s = setup(); let calls = 0;
  const render = async () => { calls++; return html(); };
  const run = (r = request(), build = 'build-a') => serveGalleryHtml(r, render, s.cache, s.ctx, build);
  assert.equal((await run()).headers.get('X-Gallery-HTML-Cache'), 'MISS');
  await Promise.all(s.pending);
  const hit = await run();
  assert.equal(hit.headers.get('X-Gallery-HTML-Cache'), 'HIT');
  assert.equal(calls, 1);
  assert.equal(await hit.text(), '<h1>Public gallery</h1>');
  assert.equal(hit.headers.get('Set-Cookie'), 'NEXT_LOCALE=en; Path=/; SameSite=lax');
  assert.equal(hit.headers.get('Cache-Control'), 'private, no-cache, no-store, max-age=0');
  assert.equal(hit.headers.get('X-Op-Gallery-Locale'), null);
  // SessionProvider 即使未登录，也会设置 CSRF 和 callback Cookie；它们不是用户会话。
  assert.equal((await run(request('/image-prompts', { cookie: '__Host-next-auth.csrf-token=test; __Secure-next-auth.callback-url=https%3A%2F%2Fwww.open-prompts.com' }))).headers.get('X-Gallery-HTML-Cache'), 'HIT');
  await run(request('/image-prompts', { 'Accept-Language': 'zh-CN', cookie: 'NEXT_LOCALE=zh' }));
  await run(request(), 'build-b');
  assert.equal(calls, 3);
});

test('public gallery strips identity before rendering and shares only anonymous HTML', async () => {
  const s = setup();
  const original = request('/zh/image-prompts', { cookie: 'NEXT_LOCALE=zh; __Secure-next-auth.session-token.0=private; unknown=private', authorization: 'Bearer private' });
  let calls = 0;
  const render = async (r: Request) => {
    calls++;
    assert.equal(r.headers.get('cookie'), 'NEXT_LOCALE=zh');
    assert.equal(r.headers.get('authorization'), null);
    return html();
  };
  await serveGalleryHtml(original, render, s.cache, s.ctx, 'a');
  await Promise.all(s.pending);
  const hit = await serveGalleryHtml(request('/zh/image-prompts', { cookie: 'NEXT_LOCALE=zh; __Secure-next-auth.session-token=other' }), render, s.cache, s.ctx, 'a');
  assert.equal(hit.headers.get('X-Gallery-HTML-Cache'), 'HIT');
  assert.equal(calls, 1);
  assert.ok(original.headers.get('cookie')?.includes('private'));
});

test('APIs, query filters and every RSC variant bypass the HTML cache', async () => {
  const s = setup();
  const requests = [
    request('/gallery'), request('/zh/gallery'), request('/image-prompts?model=GPT'), request('/api/gallery-bootstrap'), request('/account'),
    request('/image-prompts', { RSC: '1' }),
    request('/image-prompts', { 'Next-Router-State-Tree': 'test' }),
    request('/image-prompts', { 'Next-Router-Prefetch': '1' }),
    request('/image-prompts', { 'Next-Router-Segment-Prefetch': '/_tree' }),
    new Request('https://www.open-prompts.com/image-prompts', { method: 'POST' }),
  ];
  for (const r of requests) assert.equal((await serveGalleryHtml(r, async received => { assert.equal(received, r); return html(); }, s.cache, s.ctx, 'a')).headers.get('X-Gallery-HTML-Cache'), null);
  const sessionQuery = request('/image-prompts?model=GPT', { cookie: 'next-auth.session-token=private' });
  await serveGalleryHtml(sessionQuery, async received => { assert.equal(received.headers.get('cookie'), 'next-auth.session-token=private'); return html(); }, s.cache, s.ctx, 'a');
  assert.equal(s.entries.size, 0);
});

test('redirects, errors and non-locale Set-Cookie responses are never cached', async () => {
  const s = setup();
  for (const response of [Response.redirect('https://www.open-prompts.com/zh/image-prompts'), new Response('failed', { status: 500 }),
    new Response('private', { headers: { 'Content-Type': 'text/html', 'Set-Cookie': 'session=secret; Path=/' } })]) {
    await serveGalleryHtml(request(), async () => response, s.cache, s.ctx, 'a');
  }
  await Promise.all(s.pending);
  assert.equal(s.entries.size, 0);
});

test('cache failure serves original HTML', async () => {
  const s = setup();
  const failing = { async match() { throw Error('cache unavailable'); }, async put() { throw Error('cache unavailable'); } };
  const r = await serveGalleryHtml(request(), async () => html(), failing, s.ctx, 'a');
  assert.equal(await r.text(), '<h1>Public gallery</h1>');
  await Promise.all(s.pending);
});

test('new locale HTML caches preserve each locale cookie without mixing languages', async () => {
  const s = setup();
  for (const locale of ['ko','fr','de','es','pt']) {
    const r = request(`/${locale}/image-prompts`, {cookie: `NEXT_LOCALE=${locale}; session=private`});
    const render = async (received: Request) => {
      assert.equal(received.headers.get('cookie'), `NEXT_LOCALE=${locale}`);
      return new Response(`<h1>${locale}</h1>`, {headers: {'Content-Type':'text/html', 'Set-Cookie':`NEXT_LOCALE=${locale}; Path=/; SameSite=lax`}});
    };
    assert.equal((await serveGalleryHtml(r, render, s.cache, s.ctx, 'languages')).headers.get('X-Gallery-HTML-Cache'), 'MISS');
    await Promise.all(s.pending);
    const hit = await serveGalleryHtml(r, render, s.cache, s.ctx, 'languages');
    assert.equal(hit.headers.get('X-Gallery-HTML-Cache'), 'HIT');
    assert.equal(await hit.text(), `<h1>${locale}</h1>`);
    assert.ok(hit.headers.get('set-cookie')?.startsWith(`NEXT_LOCALE=${locale};`));
  }
});
