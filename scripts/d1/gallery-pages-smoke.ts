/** 公开预览分页验收；只读，不输出提示词或用户凭据。 */
import { strict as assert } from 'node:assert';
const base = process.argv[2] || 'http://localhost:3103';
async function page(offset: number) {
  const started = performance.now();
  const response = await fetch(`${base}/api/gallery-bootstrap?offset=${offset}`, { signal: AbortSignal.timeout(20000) }).catch(error => {
    const code = error?.cause?.code;
    throw new Error(`Preview offset ${offset}: ${typeof code === 'string' && /^[A-Z_]+$/.test(code) ? code : error instanceof Error ? error.name : 'network error'}`);
  });
  assert.equal(response.status, 200, `preview page ${offset} status`);
  const text = await response.text();
  const data = JSON.parse(text) as { items: { id: string; prompt: string }[]; total: number; nextOffset: number | null };
  assert.ok(Array.isArray(data.items));
  assert.ok(data.items.length <= 18);
  assert.ok(data.items.every(item => item.prompt === ''));
  console.log(JSON.stringify({ offset, count: data.items.length, bytes: Buffer.byteLength(text), durationMs: Math.round(performance.now() - started), cache: response.headers.get('X-Gallery-Cache') }));
  return data;
}
async function main() {
  const pages: Awaited<ReturnType<typeof page>>[] = [];
  for (const offset of [0, 18, 36]) pages.push(await page(offset));
  assert.ok(pages[0].total > 54);
  const ids = pages.flatMap(result => result.items.map(item => item.id));
  assert.equal(new Set(ids).size, ids.length, 'successive pages must not overlap');
  assert.deepEqual(pages.map(result => result.nextOffset), [18, 36, 54]);
  const end = await page(pages[0].total);
  assert.equal(end.items.length, 0);
  assert.equal(end.nextOffset, null);
  const repeat = await page(18);
  assert.deepEqual(repeat.items.map(item => item.id), pages[1].items.map(item => item.id));
  console.log('PASS: small public preview pages, stable order, no full bodies, non-overlap and end-of-list');
}
main().catch(error => {
  console.error(error instanceof assert.AssertionError ? error.message : `Gallery page smoke failed (${error instanceof Error ? error.message : 'unknown error'})`);
  process.exitCode = 1;
});
