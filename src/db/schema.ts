import { sql } from 'drizzle-orm';
import {
  bigint,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

/** `p_prompts` — see supabase/migrations for full history (create + review status). */
export const promptReviewStatuses = ['pending', 'approved', 'rejected'] as const;
export type PromptReviewStatus = (typeof promptReviewStatuses)[number];

export const promptVisibilities = ['draft', 'private', 'public'] as const;
export type PromptVisibility = (typeof promptVisibilities)[number];

export const prompts = pgTable('p_prompts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  prompt: text('prompt').notNull().default(''),
  templateId: text('template_id'),
  model: text('model').notNull().default('GPT Image 2'),
  tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
  sourceUrl: text('source_url'),
  authorHandle: text('author_handle'),
  images: text('images').array().notNull().default(sql`'{}'::text[]`),
  /** Gallery shows `approved` only; new user submissions typically start as `pending`. */
  status: text('status').notNull().default('approved'),
  /** Owner user id; no DB FK — enforced in API (avoids DDL lock / pooler issues). */
  submittedBy: uuid('submitted_by'),
  visibility: text('visibility').notNull().default('public'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const users = pgTable('p_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  passwordHash: text('password_hash'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  /** Last authenticated activity; used for admin DAU (UTC calendar day). */
  lastActiveAt: timestamp('last_active_at', { withTimezone: true }),
});

export const accounts = pgTable(
  'p_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('oauth'),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refreshToken: text('refresh_token'),
    accessToken: text('access_token'),
    expiresAt: bigint('expires_at', { mode: 'number' }),
    tokenType: text('token_type'),
    scope: text('scope'),
    idToken: text('id_token'),
    sessionState: text('session_state'),
  },
  (t) => ({
    providerAccountKey: uniqueIndex('p_accounts_provider_provider_account_id_key').on(
      t.provider,
      t.providerAccountId
    ),
  })
);

export const verificationTokens = pgTable(
  'p_verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.identifier, t.token] }),
  })
);
