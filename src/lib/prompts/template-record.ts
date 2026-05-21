import { randomBytes } from 'node:crypto';

import { and, count, desc, eq, ilike, or, sql, type SQL } from 'drizzle-orm';
import type { Db } from '~/db/client';
import { prompts, users } from '~/db/schema';
import type { AdminTemplateRecord } from '~/lib/prompts/template-types';
import {
  type PromptReviewStatus,
  type PromptVisibility,
  type TemplateRecord,
  type TemplateWriteInput,
  resolveStatusForVisibility,
} from '~/lib/prompts/template-types';

export type { TemplateRecord, TemplateWriteInput, PromptReviewStatus, PromptVisibility };
export {
  modelLabelToId,
  parseReviewStatus,
  parseVisibility,
  resolveStatusForVisibility,
} from '~/lib/prompts/template-types';

function slugify(input: string): string {
  const s = String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return s.slice(0, 72) || 'prompt';
}

function rowToRecord(row: typeof prompts.$inferSelect): TemplateRecord {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description ?? '',
    prompt: row.prompt ?? '',
    model: row.model,
    tags: Array.isArray(row.tags) ? row.tags : [],
    images: Array.isArray(row.images) ? row.images : [],
    sourceUrl: row.sourceUrl,
    authorHandle: row.authorHandle,
    status: row.status as PromptReviewStatus,
    visibility: row.visibility as PromptVisibility,
    submittedBy: row.submittedBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function insertUserTemplate(
  db: Db,
  userId: string,
  input: TemplateWriteInput,
): Promise<TemplateRecord> {
  const base = slugify(input.title);
  const status = resolveStatusForVisibility(input.visibility);

  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = `${base}-${randomBytes(4).toString('hex')}`;
    try {
      const [row] = await db
        .insert(prompts)
        .values({
          slug,
          title: input.title,
          description: input.description,
          prompt: input.prompt,
          model: input.modelLabel,
          tags: input.tags,
          images: input.images,
          sourceUrl: input.sourceUrl ?? null,
          submittedBy: userId,
          visibility: input.visibility,
          status,
        })
        .returning();
      if (!row) throw new Error('Insert failed');
      return rowToRecord(row);
    } catch (e: unknown) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
      if (code === '23505' && attempt < 5) continue;
      throw e;
    }
  }
  throw new Error('Could not allocate slug');
}

export async function updateUserTemplate(
  db: Db,
  id: number,
  userId: string,
  input: Partial<TemplateWriteInput>,
  isAdmin: boolean,
): Promise<TemplateRecord | null> {
  const [existing] = await db.select().from(prompts).where(eq(prompts.id, id)).limit(1);
  if (!existing) return null;
  if (!isAdmin && existing.submittedBy !== userId) return null;

  const visibility = input.visibility ?? (existing.visibility as PromptVisibility);
  const patch: Partial<typeof prompts.$inferInsert> = {
    updatedAt: new Date(),
  };
  if (input.title !== undefined) patch.title = input.title;
  if (input.description !== undefined) patch.description = input.description;
  if (input.prompt !== undefined) patch.prompt = input.prompt;
  if (input.modelLabel !== undefined) patch.model = input.modelLabel;
  if (input.tags !== undefined) patch.tags = input.tags;
  if (input.images !== undefined) patch.images = input.images;
  if (input.sourceUrl !== undefined) patch.sourceUrl = input.sourceUrl;
  if (input.visibility !== undefined) {
    patch.visibility = input.visibility;
    if (!isAdmin && input.visibility === 'public' && existing.status === 'approved') {
      patch.status = 'pending';
    } else if (!isAdmin) {
      patch.status = resolveStatusForVisibility(input.visibility);
    }
  }

  const [row] = await db.update(prompts).set(patch).where(eq(prompts.id, id)).returning();
  return row ? rowToRecord(row) : null;
}

export async function deleteUserTemplate(
  db: Db,
  id: number,
  userId: string,
  isAdmin: boolean,
): Promise<boolean> {
  const [existing] = await db
    .select({ submittedBy: prompts.submittedBy })
    .from(prompts)
    .where(eq(prompts.id, id))
    .limit(1);
  if (!existing) return false;
  if (!isAdmin && existing.submittedBy !== userId) return false;
  await db.delete(prompts).where(eq(prompts.id, id));
  return true;
}

export async function getTemplateById(db: Db, id: number): Promise<TemplateRecord | null> {
  const [row] = await db.select().from(prompts).where(eq(prompts.id, id)).limit(1);
  return row ? rowToRecord(row) : null;
}

export type ListTemplatesOpts = {
  userId?: string;
  admin?: boolean;
  q?: string;
  status?: PromptReviewStatus;
  visibility?: PromptVisibility;
  limit?: number;
  offset?: number;
};

export type ListAdminTemplatesOpts = {
  q?: string;
  status?: PromptReviewStatus;
  visibility?: PromptVisibility;
  limit?: number;
  offset?: number;
};

function buildListConditions(opts: {
  q?: string;
  status?: PromptReviewStatus;
  visibility?: PromptVisibility;
}) {
  const conditions: SQL[] = [];
  if (opts.status) conditions.push(eq(prompts.status, opts.status));
  if (opts.visibility) conditions.push(eq(prompts.visibility, opts.visibility));
  if (opts.q?.trim()) {
    const pattern = `%${opts.q.trim().replace(/%/g, '\\%')}%`;
    conditions.push(
      or(
        ilike(prompts.title, pattern),
        ilike(prompts.prompt, pattern),
        ilike(prompts.description, pattern),
      ) as SQL,
    );
  }
  return conditions.length ? and(...conditions) : undefined;
}

export async function listTemplates(db: Db, opts: ListTemplatesOpts) {
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100);
  const offset = Math.max(opts.offset ?? 0, 0);
  const conditions: SQL[] = [];

  if (!opts.admin && opts.userId) {
    conditions.push(eq(prompts.submittedBy, opts.userId));
  }
  if (opts.status) conditions.push(eq(prompts.status, opts.status));
  if (opts.visibility) conditions.push(eq(prompts.visibility, opts.visibility));
  if (opts.q?.trim()) {
    const pattern = `%${opts.q.trim().replace(/%/g, '\\%')}%`;
    conditions.push(
      or(
        ilike(prompts.title, pattern),
        ilike(prompts.prompt, pattern),
        ilike(prompts.description, pattern),
      ) as SQL,
    );
  }

  const where = conditions.length ? and(...conditions) : undefined;

  const [totalRow] = await db.select({ n: count() }).from(prompts).where(where);
  const rows = await db
    .select()
    .from(prompts)
    .where(where)
    .orderBy(desc(prompts.updatedAt))
    .limit(limit)
    .offset(offset);

  return {
    items: rows.map(rowToRecord),
    total: Number(totalRow?.n ?? 0),
    limit,
    offset,
  };
}

/** All templates across users (never scoped to the current session). */
export async function listTemplatesForAdmin(db: Db, opts: ListAdminTemplatesOpts) {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const where = buildListConditions(opts);

  const rows = await db
    .select({
      row: prompts,
      submitterEmail: users.email,
    })
    .from(prompts)
    .leftJoin(users, eq(prompts.submittedBy, users.id))
    .where(where)
    .orderBy(desc(prompts.updatedAt))
    .limit(limit)
    .offset(offset);

  const items: AdminTemplateRecord[] = rows.map(({ row, submitterEmail }) => ({
    ...rowToRecord(row),
    submitterEmail: submitterEmail ?? null,
  }));

  let total: number | null = null;
  try {
    const [totalRow] = await db.select({ n: count() }).from(prompts).where(where);
    total = Number(totalRow?.n ?? 0);
  } catch {
    total = null;
  }

  return {
    items,
    total,
    limit,
    offset,
    hasMore: items.length >= limit,
  };
}

export async function adminSetReviewStatus(
  db: Db,
  id: number,
  status: PromptReviewStatus,
): Promise<TemplateRecord | null> {
  const [row] = await db
    .update(prompts)
    .set({ status, updatedAt: new Date() })
    .where(eq(prompts.id, id))
    .returning();
  return row ? rowToRecord(row) : null;
}

export async function countUserTemplates(db: Db, userId: string) {
  const [row] = await db
    .select({ n: count() })
    .from(prompts)
    .where(eq(prompts.submittedBy, userId));
  return Number(row?.n ?? 0);
}

export async function countPendingReview(db: Db) {
  const [row] = await db
    .select({ n: count() })
    .from(prompts)
    .where(eq(prompts.status, 'pending'));
  return Number(row?.n ?? 0);
}

/** Gallery: approved + (legacy null owner or public visibility). */
export function galleryPublicFilter() {
  return and(
    eq(prompts.status, 'approved'),
    or(sql`${prompts.submittedBy} is null`, eq(prompts.visibility, 'public')),
  );
}
