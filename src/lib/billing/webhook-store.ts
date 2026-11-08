import { eq, sql } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { creditAccounts, creditTransactions, orders, stripeEvents, subscriptions } from '~/db/schema';

export type StoredOrder = {
  orderNo: string;
  ownerId: string;
  amount: number;
  currency: string;
  productId: string;
  credits: number;
  status: string;
};

export type StoredAccount = {
  purchasedBalance: number;
  monthlyBalance: number;
  monthlyExpiresAt: number | null;
};

export type WebhookStore = {
  getOrder(orderNo: string): Promise<StoredOrder | null>;
  getAccount(ownerId: string): Promise<StoredAccount>;
  claimEvent(eventId: string, eventType: string): Promise<'claimed' | 'processed'>;
  finishEvent(eventId: string, eventType: string, status: 'processed' | 'ignored' | 'failed'): Promise<void>;
  addPurchased(input: { ownerId: string; credits: number; referenceId: string; idempotencyKey: string; paymentIntentId: string | null }): Promise<'credited' | 'duplicate'>;
  setMonthly(input: { ownerId: string; subscriptionId: string; customerId: string; credits: number; periodEndMs: number; orderNo: string; idempotencyKey: string }): Promise<'credited' | 'duplicate'>;
  syncSubscription(input: { ownerId: string; subscriptionId: string; customerId: string; status: 'active' | 'past_due' | 'canceled'; periodEndMs: number | null }): Promise<void>;
};

export function memoryWebhookStore(): { store: WebhookStore; orders: Map<string, StoredOrder>; subscriptions: Map<string, string> } {
  const ordersByNo = new Map<string, StoredOrder>();
  const accounts = new Map<string, StoredAccount>();
  const events = new Map<string, string>();
  const grants = new Set<string>();
  const periods = new Map<string, number>();
  const subscriptionStatus = new Map<string, string>();
  const account = (ownerId: string): StoredAccount => {
    const current = accounts.get(ownerId) ?? { purchasedBalance: 0, monthlyBalance: 0, monthlyExpiresAt: null };
    accounts.set(ownerId, current);
    return current;
  };
  const store: WebhookStore = {
    getOrder: async (orderNo) => ordersByNo.get(orderNo) ?? null,
    getAccount: async (ownerId) => ({ ...account(ownerId) }),
    claimEvent: async (eventId) => {
      const current = events.get(eventId);
      if (current === 'processed' || current === 'processing') return 'processed';
      events.set(eventId, 'processing');
      return 'claimed';
    },
    finishEvent: async (eventId, _eventType, status) => { events.set(eventId, status); },
    addPurchased: async (input) => {
      if (grants.has(input.idempotencyKey)) return 'duplicate';
      grants.add(input.idempotencyKey);
      account(input.ownerId).purchasedBalance += input.credits;
      const order = ordersByNo.get(input.referenceId);
      if (order) order.status = 'paid';
      return 'credited';
    },
    setMonthly: async (input) => {
      if (grants.has(input.idempotencyKey) || (periods.get(input.subscriptionId) ?? 0) >= input.periodEndMs) return 'duplicate';
      grants.add(input.idempotencyKey);
      periods.set(input.subscriptionId, input.periodEndMs);
      const current = account(input.ownerId);
      current.monthlyBalance = input.credits;
      current.monthlyExpiresAt = input.periodEndMs;
      return 'credited';
    },
    syncSubscription: async (input) => { subscriptionStatus.set(input.subscriptionId, input.status); },
  };
  return { store, orders: ordersByNo, subscriptions: subscriptionStatus };
}

export function createD1WebhookStore(): WebhookStore | null {
  const db = getDb();
  if (!db) return null;
  return {
    getOrder: async (orderNo) => {
      const row = await db.select().from(orders).where(eq(orders.orderNo, orderNo)).get();
      return row ? { orderNo: row.orderNo, ownerId: row.ownerId, amount: row.amount, currency: row.currency, productId: row.productId, credits: row.credits, status: row.status } : null;
    },
    getAccount: async (ownerId) => {
      const row = await db.select().from(creditAccounts).where(eq(creditAccounts.ownerId, ownerId)).get();
      return { purchasedBalance: row?.purchasedBalance ?? 0, monthlyBalance: row?.monthlyBalance ?? 0, monthlyExpiresAt: row?.monthlyExpiresAt?.getTime() ?? null };
    },
    claimEvent: async (eventId, eventType) => {
      const inserted = await db.insert(stripeEvents).values({ eventId, eventType, status: 'processing' }).onConflictDoNothing().run();
      if ((inserted.meta.changes ?? 0) === 1) return 'claimed';
      const row = await db.select({ status: stripeEvents.status }).from(stripeEvents).where(eq(stripeEvents.eventId, eventId)).get();
      return row?.status === 'processed' || row?.status === 'processing' ? 'processed' : 'claimed';
    },
    finishEvent: async (eventId, _eventType, status) => {
      await db.insert(stripeEvents).values({ eventId, eventType: _eventType, status, processedAt: new Date() })
        .onConflictDoUpdate({ target: stripeEvents.eventId, set: { status, processedAt: new Date() } });
    },
    addPurchased: async (input) => {
      const existing = await db.select({ id: creditTransactions.id }).from(creditTransactions).where(eq(creditTransactions.idempotencyKey, input.idempotencyKey)).get();
      if (existing) return 'duplicate';
      await db.insert(creditAccounts).values({ ownerId: input.ownerId, purchasedBalance: input.credits })
        .onConflictDoUpdate({ target: creditAccounts.ownerId, set: { purchasedBalance: sql`${creditAccounts.purchasedBalance} + ${input.credits}`, updatedAt: new Date() } });
      const account = await db.select().from(creditAccounts).where(eq(creditAccounts.ownerId, input.ownerId)).get();
      await db.insert(creditTransactions).values({
        ownerId: input.ownerId, amount: input.credits, kind: 'purchase', referenceId: input.referenceId,
        idempotencyKey: input.idempotencyKey, balanceAfter: account?.purchasedBalance ?? input.credits, pool: 'purchased',
      });
      await db.update(orders).set({ status: 'paid', paidAt: new Date(), stripePaymentIntentId: input.paymentIntentId, updatedAt: new Date() }).where(eq(orders.orderNo, input.referenceId));
      return 'credited';
    },
    setMonthly: async (input) => {
      const existing = await db.select({ id: creditTransactions.id }).from(creditTransactions).where(eq(creditTransactions.idempotencyKey, input.idempotencyKey)).get();
      if (existing) return 'duplicate';
      const current = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, input.subscriptionId)).get();
      if (current?.latestGrantedPeriodEnd && current.latestGrantedPeriodEnd.getTime() >= input.periodEndMs) return 'duplicate';
      await db.insert(creditAccounts).values({ ownerId: input.ownerId, monthlyBalance: input.credits, monthlyExpiresAt: new Date(input.periodEndMs) })
        .onConflictDoUpdate({ target: creditAccounts.ownerId, set: { monthlyBalance: input.credits, monthlyExpiresAt: new Date(input.periodEndMs), updatedAt: new Date() } });
      const account = await db.select().from(creditAccounts).where(eq(creditAccounts.ownerId, input.ownerId)).get();
      await db.insert(creditTransactions).values({
        ownerId: input.ownerId, amount: input.credits, kind: 'purchase', referenceId: input.subscriptionId,
        idempotencyKey: input.idempotencyKey, balanceAfter: account?.monthlyBalance ?? input.credits, pool: 'monthly',
      });
      await db.insert(subscriptions).values({
        stripeSubscriptionId: input.subscriptionId, stripeCustomerId: input.customerId, ownerId: input.ownerId,
        status: 'active', currentPeriodEnd: new Date(input.periodEndMs), latestGrantedPeriodEnd: new Date(input.periodEndMs),
      }).onConflictDoUpdate({
        target: subscriptions.stripeSubscriptionId,
        set: { status: 'active', currentPeriodEnd: new Date(input.periodEndMs), latestGrantedPeriodEnd: new Date(input.periodEndMs), updatedAt: new Date() },
      });
      if (input.orderNo) await db.update(orders).set({ status: 'paid', paidAt: new Date(), updatedAt: new Date() }).where(eq(orders.orderNo, input.orderNo));
      return 'credited';
    },
    syncSubscription: async (input) => {
      await db.insert(subscriptions).values({
        stripeSubscriptionId: input.subscriptionId, stripeCustomerId: input.customerId || 'unknown', ownerId: input.ownerId,
        status: input.status, currentPeriodEnd: input.periodEndMs ? new Date(input.periodEndMs) : null,
      }).onConflictDoUpdate({
        target: subscriptions.stripeSubscriptionId,
        set: { status: input.status, stripeCustomerId: input.customerId || 'unknown', currentPeriodEnd: input.periodEndMs ? new Date(input.periodEndMs) : null, updatedAt: new Date() },
      });
    },
  };
}
