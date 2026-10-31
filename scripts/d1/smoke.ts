/** 对 Worker 做隔离账号端到端验证；自动清理测试用户和模板。 */
import { strict as assert } from 'node:assert';
import { eq } from 'drizzle-orm';
import { openScriptDb } from './client';
import { prompts, users } from '../../src/db/schema';
const base = process.argv[2] || 'http://localhost:8788';
const email = `d1-smoke-${crypto.randomUUID()}@example.invalid`;
const password = crypto.randomUUID();
const jar = new Map<string, string>();
async function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('cookie', Array.from(jar).map(([k, v]) => `${k}=${v}`).join('; '));
  const response = await fetch(`${base}${path}`, { ...init, headers, redirect: 'manual', signal: AbortSignal.timeout(30000) });
  for (const cookie of response.headers.getSetCookie()) { const first = cookie.split(';')[0]; const i = first.indexOf('='); jar.set(first.slice(0, i), first.slice(i + 1)); }
  return response;
}
async function main() {
  const client = await openScriptDb();
  try {
    const registered = await request('/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, name: 'D1 migration smoke' }) });
    assert.equal(registered.status, 200, 'registration');
    const csrf = await (await request('/api/auth/csrf')).json() as { csrfToken: string };
    await request('/api/auth/callback/credentials', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ email, password, csrfToken: csrf.csrfToken, json: 'true', callbackUrl: `${base}/account` }) });
    const session = await (await request('/api/auth/session')).json() as { user?: { id: string } };
    assert.ok(session.user?.id, 'credentials session');
    const [storedUser] = await client.db.select({ id: users.id }).from(users).where(eq(users.email, email));
    assert.equal(storedUser?.id, session.user.id, 'HTTP writes and session use target D1');
    assert.equal((await request('/api/admin/users')).status, 403, 'non-admin denied');
    const body = { title: 'D1 migration private smoke', prompt: 'A synthetic migration test prompt', modelId: 'gptImage2', category: 'artStyles', visibility: 'private', tags: ['migration', 'test'], images: [] };
    const createdResponse = await request('/api/my/templates', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal(createdResponse.status, 200, 'template create');
    const created = await createdResponse.json() as { item: { id: number; status: string; visibility: string } };
    const id = created.item.id;
    assert.ok(id > 1634, 'sequence preserved');
    assert.equal(created.item.visibility, 'private');
    assert.equal((await request(`/api/my/templates/${id}`)).status, 200, 'owner read');
    const cookies = new Map(jar); jar.clear();
    assert.equal((await request(`/api/my/templates/${id}`)).status, 401, 'anonymous denied');
    for (const [k, v] of Array.from(cookies)) jar.set(k, v);
    assert.equal((await request(`/api/my/templates/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, title: 'D1 migration updated smoke' }) })).status, 200, 'template update');
    assert.equal((await request(`/api/my/templates/${id}`, { method: 'DELETE' })).status, 200, 'template delete');
    console.log('PASS: register, password login, session, template create/read/update/delete, visibility and anonymous isolation, ID sequence');
  } finally {
    const [user] = await client.db.select({ id: users.id }).from(users).where(eq(users.email, email));
    if (user) { await client.db.delete(prompts).where(eq(prompts.submittedBy, user.id)); await client.db.delete(users).where(eq(users.id, user.id)); }
    await client.dispose();
  }
}
main().catch(error => { console.error(error instanceof assert.AssertionError ? `Smoke assertion failed: ${error.message}` : 'Worker smoke failed (private details suppressed)'); process.exitCode = 1; });
