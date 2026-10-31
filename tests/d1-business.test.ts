import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { eq, sql } from 'drizzle-orm';
import { openScriptDb } from '../scripts/d1/client';
import { users, accounts, prompts } from '../src/db/schema';
import { ilike, isUniqueConstraintError } from '../src/db/sqlite-helpers';
import { ensureOAuthUser } from '../src/lib/auth/sync-oauth-user';

// 只操作隔离的合成用户，不读取或输出真实凭据。
test('D1 preserves business types, OAuth linking, search, constraints and large fields', async () => {
  const client = await openScriptDb(false);
  const { db } = client;
  const id = crypto.randomUUID();
  const slug = `d1-test-${id}`;
  const date = new Date('2026-10-23T23:59:59.987Z');
  try {
    await db.insert(users).values({ id, email: `${id}@example.invalid`, name: 'D1 test', createdAt: date });
    const [u] = await db.select().from(users).where(eq(users.id, id));
    assert.equal(u.createdAt.toISOString(), date.toISOString());
    const oauth = { email: u.email, provider: 'test', providerAccountId: id };
    assert.equal((await ensureOAuthUser(db, oauth)).id, id);
    assert.equal((await ensureOAuthUser(db, oauth)).id, id);
    assert.equal((await db.select().from(accounts).where(eq(accounts.userId, id))).length, 1);
    const image = `data:image/png;base64,${'a'.repeat(601000)}`;
    const [p] = await db.insert(prompts).values({ slug, title: '100% Alpha', tags: ['中文', 'a'], images: [image], submittedBy: id, visibility: 'private' }).returning();
    assert.ok(p.id > 0);
    assert.deepEqual(p.tags, ['中文', 'a']);
    assert.equal(p.images[0], image);
    const found = await db.select().from(prompts).where(ilike(prompts.title, '%100\\% alpha%'));
    assert.ok(found.some(row => row.id === p.id));
    const [day] = await db.select({ date: sql<string>`strftime('%Y-%m-%d', ${users.createdAt} / 1000.0, 'unixepoch')` }).from(users).where(eq(users.id, id));
    assert.equal(day.date, '2026-10-23');
    await assert.rejects(async () => { await db.insert(prompts).values({ slug, title: 'duplicate' }); }, isUniqueConstraintError);
    await assert.rejects(async () => { await db.update(prompts).set({ status: 'invalid' }).where(eq(prompts.id, p.id)); });
    await assert.rejects(async () => { await db.update(prompts).set({ visibility: 'invalid' }).where(eq(prompts.id, p.id)); });
    await db.delete(users).where(eq(users.id, id));
    assert.equal((await db.select().from(accounts).where(eq(accounts.userId, id))).length, 0);
  } finally {
    await db.delete(prompts).where(eq(prompts.slug, slug));
    await db.delete(users).where(eq(users.id, id));
    await client.dispose();
  }
});

test('bulk moderation and owner deletion support 100 IDs within D1 binding limits', async () => {
  const client = await openScriptDb(false);
  const { drizzle } = await import('drizzle-orm/d1');
  const schema = await import('../src/db/schema');
  const { adminBulkSetReviewStatus, bulkDeleteUserTemplates } = await import('../src/lib/prompts/template-record');
  const db = drizzle(client.binding, { schema, logger: { logQuery(_query, params) { assert.ok(params.length <= 100); } } });
  const id = crypto.randomUUID();
  try {
    await db.insert(users).values({ id, email: `${id}@example.invalid` });
    const ids: number[] = [];
    for (let i = 0; i < 100; i++) {
      const [row] = await db.insert(prompts).values({ slug: `bulk-${id}-${i}`, title: 'bulk test', submittedBy: id, visibility: 'private' }).returning({ id: prompts.id });
      ids.push(row.id);
    }
    assert.equal(await adminBulkSetReviewStatus(db, ids, 'rejected'), 100);
    assert.equal(await bulkDeleteUserTemplates(db, ids, 'another-user'), 0);
    assert.equal(await bulkDeleteUserTemplates(db, ids, id), 100);
  } finally {
    await db.delete(prompts).where(eq(prompts.submittedBy, id));
    await db.delete(users).where(eq(users.id, id));
    await client.dispose();
  }
});
