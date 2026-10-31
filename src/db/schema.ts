import { sql } from 'drizzle-orm';
import {
  integer,
  index,
  sqliteTable,
  check,
  primaryKey,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/** D1 / SQLite：数组存 JSON，时间存 UTC 毫秒，既有 UUID 保持不变。 */
export const promptReviewStatuses = ['pending', 'approved', 'rejected'] as const;
export type PromptReviewStatus = (typeof promptReviewStatuses)[number];

export const promptVisibilities = ['draft', 'private', 'public'] as const;
export type PromptVisibility = (typeof promptVisibilities)[number];

export const prompts = sqliteTable('p_prompts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  prompt: text('prompt').notNull().default(''),
  templateId: text('template_id'),
  model: text('model').notNull().default('GPT Image 2'),
  /** Submit primary category key — see `SUBMIT_CATEGORY_KEYS`. */
  category: text('category'),
  tags: text('tags', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  sourceUrl: text('source_url'),
  authorHandle: text('author_handle'),
  images: text('images', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  /** Gallery shows `approved` only; new user submissions typically start as `pending`. */
  status: text('status').notNull().default('approved'),
  /** Owner user id; no DB FK — enforced in API (avoids DDL lock / pooler issues). */
  submittedBy: text('submitted_by'),
  visibility: text('visibility').notNull().default('public'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, t => ({
  statusCheck: check('p_prompts_status_chk', sql`${t.status} IN ('pending', 'approved', 'rejected')`),
  visibilityCheck: check('p_prompts_visibility_chk', sql`${t.visibility} IN ('draft', 'private', 'public')`),
  categoryIndex: index('p_prompts_category_idx').on(t.category),
  statusIndex: index('p_prompts_status_idx').on(t.status),
  ownerIndex: index('p_prompts_submitted_by_idx').on(t.submittedBy),
  visibilityIndex: index('p_prompts_visibility_idx').on(t.visibility),
  modelIndex: index('prompts_model_idx').on(t.model),
  sortIndex: index('prompts_sort_idx').on(t.sortOrder, t.createdAt),
  galleryIndex: index('p_prompts_gallery_created_idx').on(t.status, t.createdAt, t.id),
}));

export const users = sqliteTable('p_users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'timestamp_ms' }),
  image: text('image'),
  passwordHash: text('password_hash'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  /** Last authenticated activity; used for admin DAU (UTC calendar day). */
  lastActiveAt: integer('last_active_at', { mode: 'timestamp_ms' }),
}, t => ({ activityIndex: index('p_users_last_active_at_idx').on(t.lastActiveAt) }));

export const accounts = sqliteTable(
  'p_accounts',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('oauth'),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: integer('expires_at'),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
  },
  (t) => ({
    userIndex: index('p_accounts_user_id_idx').on(t.userId),
    providerAccountKey: uniqueIndex('p_accounts_provider_provider_account_id_key').on(
      t.provider,
      t.providerAccountId
    ),
  })
);

export const verificationTokens = sqliteTable(
  'p_verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: integer('expires', { mode: 'timestamp_ms' }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  })
);
