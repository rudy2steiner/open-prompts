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

const billingTimestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
};

/** 用户 id 或访客 id。访客不写入 p_users。 */
export const orders = sqliteTable('p_orders', {
  orderNo: text('order_no').primaryKey(),
  ownerId: text('owner_id').notNull(),
  amount: integer('amount').notNull(),
  currency: text('currency').notNull().default('usd'),
  productId: text('product_id').notNull(),
  productName: text('product_name').notNull(),
  credits: integer('credits').notNull(),
  status: text('status').notNull().default('created'),
  stripeSessionId: text('stripe_session_id'),
  stripePaymentIntentId: text('stripe_payment_intent_id'),
  paidAt: integer('paid_at', { mode: 'timestamp_ms' }),
  ...billingTimestamps,
}, t => ({
  statusCheck: check('p_orders_status_chk', sql`${t.status} IN ('created', 'paid', 'refunded')`),
  amountCheck: check('p_orders_amount_chk', sql`${t.amount} > 0`),
  creditsCheck: check('p_orders_credits_chk', sql`${t.credits} > 0`),
  ownerIndex: index('p_orders_owner_idx').on(t.ownerId, t.createdAt),
  sessionIndex: uniqueIndex('p_orders_session_idx').on(t.stripeSessionId),
}));

export const creditAccounts = sqliteTable('p_credit_accounts', {
  ownerId: text('owner_id').primaryKey(),
  purchasedBalance: integer('purchased_balance').notNull().default(0),
  monthlyBalance: integer('monthly_balance').notNull().default(0),
  monthlyExpiresAt: integer('monthly_expires_at', { mode: 'timestamp_ms' }),
  ...billingTimestamps,
}, t => ({
  purchasedCheck: check('p_credit_accounts_purchased_chk', sql`${t.purchasedBalance} >= 0`),
  monthlyCheck: check('p_credit_accounts_monthly_chk', sql`${t.monthlyBalance} >= 0`),
}));

export const creditTransactions = sqliteTable('p_credit_transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text('owner_id').notNull(),
  amount: integer('amount').notNull(),
  kind: text('kind').notNull(),
  referenceId: text('reference_id').notNull(),
  idempotencyKey: text('idempotency_key').notNull(),
  balanceAfter: integer('balance_after').notNull(),
  pool: text('pool').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, t => ({
  kindCheck: check('p_credit_transactions_kind_chk', sql`${t.kind} IN ('purchase', 'signup', 'reserve', 'refund', 'merge')`),
  poolCheck: check('p_credit_transactions_pool_chk', sql`${t.pool} IN ('purchased', 'monthly')`),
  amountCheck: check('p_credit_transactions_amount_chk', sql`${t.amount} != 0`),
  balanceCheck: check('p_credit_transactions_balance_chk', sql`${t.balanceAfter} >= 0`),
  idempotencyIndex: uniqueIndex('p_credit_transactions_idempotency_idx').on(t.idempotencyKey),
  ownerIndex: index('p_credit_transactions_owner_idx').on(t.ownerId, t.createdAt),
}));

export const subscriptions = sqliteTable('p_subscriptions', {
  stripeSubscriptionId: text('stripe_subscription_id').primaryKey(),
  stripeCustomerId: text('stripe_customer_id').notNull(),
  ownerId: text('owner_id').notNull(),
  status: text('status').notNull(),
  currentPeriodEnd: integer('current_period_end', { mode: 'timestamp_ms' }),
  latestGrantedPeriodEnd: integer('latest_granted_period_end', { mode: 'timestamp_ms' }),
  ...billingTimestamps,
}, t => ({
  statusCheck: check('p_subscriptions_status_chk', sql`${t.status} IN ('incomplete', 'active', 'past_due', 'canceled', 'unpaid')`),
  ownerIndex: index('p_subscriptions_owner_idx').on(t.ownerId, t.updatedAt),
  customerIndex: index('p_subscriptions_customer_idx').on(t.stripeCustomerId),
}));

export const stripeEvents = sqliteTable('p_stripe_events', {
  eventId: text('event_id').primaryKey(),
  eventType: text('event_type').notNull(),
  status: text('status').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  processedAt: integer('processed_at', { mode: 'timestamp_ms' }),
}, t => ({
  statusCheck: check('p_stripe_events_status_chk', sql`${t.status} IN ('processing', 'processed', 'ignored', 'failed')`),
}));

export const generations = sqliteTable('p_generations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  ownerId: text('owner_id').notNull(),
  model: text('model').notNull(),
  credits: integer('credits').notNull(),
  monthlyCredits: integer('monthly_credits').notNull().default(0),
  purchasedCredits: integer('purchased_credits').notNull().default(0),
  status: text('status').notNull(),
  images: text('images', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, t => ({
  statusCheck: check('p_generations_status_chk', sql`${t.status} IN ('reserved', 'succeeded', 'failed')`),
  creditsCheck: check('p_generations_credits_chk', sql`${t.credits} > 0`),
  ownerIndex: index('p_generations_owner_idx').on(t.ownerId, t.createdAt),
}));

export const analyticsEvents = sqliteTable('p_analytics_events', {
  id: text('id').primaryKey(),
  eventName: text('event_name').notNull(),
  ownerId: text('owner_id'),
  locale: text('locale').notNull(),
  page: text('page').notNull(),
  subject: text('subject').notNull(),
  propertiesJson: text('properties_json').notNull().default('{}'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, t => ({
  nameCheck: check('p_analytics_events_name_chk', sql`${t.eventName} IN ('Pricing Plan Click')`),
  createdIndex: index('p_analytics_events_created_idx').on(t.createdAt),
  nameCreatedIndex: index('p_analytics_events_name_created_idx').on(t.eventName, t.createdAt),
  ownerIndex: index('p_analytics_events_owner_idx').on(t.ownerId, t.createdAt),
}));

/** 账号已经获得过的提示词。重复下载同一条不新增记录。 */
export const promptDownloads = sqliteTable('p_prompt_downloads', {
  ownerId: text('owner_id').notNull(),
  promptId: text('prompt_id').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, t => ({
  pk: primaryKey({ columns: [t.ownerId, t.promptId] }),
  ownerIndex: index('p_prompt_downloads_owner_idx').on(t.ownerId, t.createdAt),
}));

export const guestSessions = sqliteTable('p_guest_sessions', {
  tokenHash: text('token_hash').primaryKey(),
  guestId: text('guest_id').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  ...billingTimestamps,
}, t => ({
  guestIndex: index('p_guest_sessions_guest_idx').on(t.guestId),
  expiryIndex: index('p_guest_sessions_expiry_idx').on(t.expiresAt),
}));
