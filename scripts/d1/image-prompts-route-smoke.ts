/** 入口改名验收：只读检查语言、永久跳转、筛选参数和 canonical。 */
import { strict as assert } from 'node:assert';
const base = process.argv[2] || 'http://localhost:3103';
async function main() {
  for (const locale of ['', 'en', 'zh', 'ja']) {
    const prefix = locale ? `/${locale}` : '';
    const response = await fetch(`${base}${prefix}/gallery?model=GPT+Image+2&category=photography`, {redirect: 'manual', headers: locale === 'en' ? {cookie:'NEXT_LOCALE=zh'} : {}, signal: AbortSignal.timeout(20000)});
    assert.equal(response.status, 308, `${prefix}/gallery permanent redirect`);
    const location = new URL(response.headers.get('location')!, base);
    assert.equal(location.pathname, `${prefix}/image-prompts`);
    assert.equal(location.searchParams.get('model'), 'GPT Image 2');
    assert.equal(location.searchParams.get('category'), 'photography');
    if (locale === 'en') {
      const normalized = await fetch(location, {redirect:'manual',headers:{cookie:'NEXT_LOCALE=zh'},signal:AbortSignal.timeout(20000)});
      assert.ok([307,308].includes(normalized.status));
      assert.equal(new URL(normalized.headers.get('location')!, base).pathname, '/image-prompts');
      assert.ok(normalized.headers.getSetCookie().some(cookie => cookie.startsWith('NEXT_LOCALE=en;')));
    }
    console.log(`PASS: ${prefix}/gallery -> ${location.pathname}, filters preserved`);
  }
  const response = await fetch(`${base}/zh/image-prompts`, {signal: AbortSignal.timeout(20000)});
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.ok(html.includes('data-gallery-masonry="shortest-column"'));
  const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/);
  assert.ok(canonical);
  assert.equal(new URL(canonical[1]).pathname, '/zh/image-prompts');
  console.log('PASS: new page, original masonry and canonical');
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? error.message : `Route smoke failed (${error instanceof Error ? error.name : 'unknown error'})`); process.exitCode = 1; });
