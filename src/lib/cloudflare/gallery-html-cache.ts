type HtmlCache = { match(request: Request): Promise<Response | undefined>; put(request: Request, response: Response): Promise<unknown> };
type Context = { waitUntil(promise: Promise<unknown>): void };
const PRIVATE = 'private, no-cache, no-store, max-age=0';

function cacheRequest(request: Request, build: string) {
  const url = new URL(request.url);
  if (request.method !== 'GET' || !/^\/(?:en\/|zh\/|ja\/|ko\/|fr\/|de\/|es\/|pt\/)?image-prompts$/.test(url.pathname) || url.search) return;
  if (['range', 'rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-router-segment-prefetch', 'next-action', 'next-url'].some(h => request.headers.has(h))) return;
  const cookies = (request.headers.get('cookie') ?? '').split(';').map(c => c.trim()).filter(Boolean);
  const localeCookie = cookies.find(c => c.startsWith('NEXT_LOCALE=')) ?? '';
  const language = request.headers.get('accept-language') ?? '';
  if (language.length > 512 || localeCookie.length > 64) return;
  // 语言协商可能产生重定向，必须在查缓存之前区分，而不是仅检查源响应。
  url.pathname = `/__edge-cache/gallery-html/${encodeURIComponent(build)}/${encodeURIComponent(url.pathname)}`;
  url.search = new URLSearchParams({ language, locale: localeCookie }).toString();
  // 公开列表从匿名请求生成，身份信息从不交给源渲染器；登录状态仍由客户端独立读取。
  const headers = new Headers(request.headers);
  headers.delete('cookie');
  headers.delete('authorization');
  if (localeCookie) headers.set('cookie', localeCookie);
  return { key: new Request(url), publicRequest: new Request(request, { headers }) };
}

/** 仅公开、无筛选的匿名首屏 HTML；RSC/API/筛选保留原请求。 */
export async function serveGalleryHtml(request: Request, render: (request: Request) => Promise<Response>, cache: HtmlCache | undefined, ctx: Context, build: string) {
  const entry = cacheRequest(request, build);
  if (!entry) return render(request);
  const { key, publicRequest } = entry;
  if (!cache) return render(publicRequest);
  const started = performance.now();
  try {
    const cached = await cache.match(key);
    if (cached) {
      const response = new Response(cached.body, cached);
      const locale = response.headers.get('X-Op-Gallery-Locale');
      response.headers.delete('X-Op-Gallery-Locale');
      if (locale && /^(en|zh|ja|ko|fr|de|es|pt)$/.test(locale)) response.headers.set('Set-Cookie', `NEXT_LOCALE=${locale}; Path=/; SameSite=lax`);
      response.headers.set('Cache-Control', PRIVATE);
      response.headers.set('X-Gallery-HTML-Cache', 'HIT');
      response.headers.append('Server-Timing', `gallery-html;dur=${(performance.now() - started).toFixed(1)}`);
      return response;
    }
  } catch { /* 缓存故障不影响原页面。 */ }
  const original = await render(publicRequest);
  const cookie = original.headers.get('set-cookie');
  const locale = cookie?.match(/^NEXT_LOCALE=(en|zh|ja|ko|fr|de|es|pt); Path=\/; SameSite=lax$/i)?.[1];
  if (original.status !== 200 || !original.headers.get('content-type')?.startsWith('text/html') || (cookie && !locale) || original.headers.get('vary')?.includes('*')) return original;
  const response = new Response(original.body, original);
  response.headers.set('X-Gallery-HTML-Cache', 'MISS');
  response.headers.append('Server-Timing', `gallery-html;dur=${(performance.now() - started).toFixed(1)}`);
  const stored = response.clone();
  stored.headers.delete('set-cookie');
  stored.headers.delete('Server-Timing');
  stored.headers.set('Cache-Control', 'public, max-age=60');
  if (locale) stored.headers.set('X-Op-Gallery-Locale', locale);
  ctx.waitUntil(cache.put(key, stored).catch(() => {}));
  return response;
}
