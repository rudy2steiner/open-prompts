/** 已配置管理员的只读 API 验证；不修改业务模板，不输出凭据。 */
import { readFile } from 'node:fs/promises';
import { parse } from 'dotenv';
import { strict as assert } from 'node:assert';
const base = process.argv[2] || 'http://localhost:3103';
let stage = 'configuration';
async function main() {
  const env = parse(await readFile('.env.production'));
  const email = env.ADMIN_EMAIL?.split(',')[0]?.trim();
  const password = env.ADMIN_PASSWORD;
  if (!email || !password) throw Error('Admin configuration unavailable');
  const jar = new Map<string, string>();
  async function request(path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set('cookie', Array.from(jar).map(([k,v]) => `${k}=${v}`).join('; '));
    const r = await fetch(`${base}${path}`, { ...init, headers, redirect: 'manual', signal: AbortSignal.timeout(30000) });
    for (const c of r.headers.getSetCookie()) { const first=c.split(';')[0], i=first.indexOf('='); jar.set(first.slice(0,i),first.slice(i+1)); }
    return r;
  }
  stage = 'csrf';
  const csrf = await (await request('/api/auth/csrf')).json() as { csrfToken: string };
  stage = 'sign-in';
  await request('/api/auth/callback/credentials', { method: 'POST', headers: { 'content-type':'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email,password,csrfToken:csrf.csrfToken,json:'true',callbackUrl:`${base}/account` }) });
  stage = 'public gallery with session';
  let htmlCache: string | null = null;
  let publicHtml = '';
  for (let i = 0; i < 3; i++) {
    const gallery = await request('/image-prompts');
    assert.equal(gallery.status, 200);
    htmlCache = gallery.headers.get('X-Gallery-HTML-Cache');
    publicHtml = await gallery.text();
  }
  assert.equal(htmlCache, 'HIT', 'authenticated visitor receives cached anonymous gallery');
  const anonymousGallery = await fetch(`${base}/image-prompts`, { headers: { cookie: 'NEXT_LOCALE=en' }, signal: AbortSignal.timeout(30000) });
  assert.equal(anonymousGallery.status, 200);
  assert.equal(await anonymousGallery.text(), publicHtml, 'anonymous and signed-in visitors receive identical public HTML');
  const session = await (await request('/api/auth/session')).json() as { user?: { email?: string } };
  assert.equal(session.user?.email, email, 'public gallery preserves session');
  stage = 'admin users';
  const r = await request('/api/admin/users?q=admin&trendDays=30');
  assert.equal(r.status,200,'admin users API');
  const users = await r.json() as { stats: { totalUsers: number; usersDailyTrend: unknown[] } };
  assert.ok(users.stats.totalUsers >= 58);
  assert.equal(users.stats.usersDailyTrend.length,30);
  assert.equal((await request('/api/admin/templates?status=pending&limit=1')).status,200,'admin moderation list API');
  console.log('PASS: admin sign-in, anonymous gallery cache with intact session, user search, UTC daily statistics, moderation listing');
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? `Admin smoke assertion failed: ${error.message}` : `Admin smoke failed at ${stage} (${error instanceof Error ? error.name : 'unknown error'}; private details suppressed)`); process.exitCode=1; });
