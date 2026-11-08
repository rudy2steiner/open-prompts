import { desc, eq } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { creditAccounts, generations, orders, subscriptions } from '~/db/schema';
import { usableMonthly } from './ledger';

export type BillingSnapshot = {
  purchasedBalance: number;
  monthlyBalance: number;
  monthlyExpiresAt: number | null;
  usable: number;
  orders: Array<{ orderNo: string; amount: number; credits: number; status: string; productId: string }>;
  subscription: { status: string; currentPeriodEnd: number | null; customerId: string } | null;
  generations: Array<{ id: string; model: string; credits: number; status: string; images: string[] }>;
};

export function emptyBillingSnapshot(): BillingSnapshot {
  return { purchasedBalance: 0, monthlyBalance: 0, monthlyExpiresAt: null, usable: 0, orders: [], subscription: null, generations: [] };
}

export async function loadBillingSnapshot(ownerId: string, now = Date.now()): Promise<BillingSnapshot> {
  const db = getDb();
  if (!db) return emptyBillingSnapshot();
  const [account, orderRows, subscription, generationRows] = await Promise.all([
    db.select().from(creditAccounts).where(eq(creditAccounts.ownerId, ownerId)).get(),
    db.select().from(orders).where(eq(orders.ownerId, ownerId)).orderBy(desc(orders.createdAt)).limit(20),
    db.select().from(subscriptions).where(eq(subscriptions.ownerId, ownerId)).orderBy(desc(subscriptions.updatedAt)).get(),
    db.select().from(generations).where(eq(generations.ownerId, ownerId)).orderBy(desc(generations.createdAt)).limit(20),
  ]);
  const purchasedBalance = account?.purchasedBalance ?? 0;
  const monthlyExpiresAt = account?.monthlyExpiresAt?.getTime() ?? null;
  const monthlyBalance = usableMonthly({
    purchasedBalance,
    monthlyBalance: account?.monthlyBalance ?? 0,
    monthlyExpiresAt,
    signupGranted: false,
  }, now);
  return {
    purchasedBalance,
    monthlyBalance,
    monthlyExpiresAt,
    usable: purchasedBalance + monthlyBalance,
    orders: orderRows.map((row) => ({ orderNo: row.orderNo, amount: row.amount, credits: row.credits, status: row.status, productId: row.productId })),
    subscription: subscription ? { status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd?.getTime() ?? null, customerId: subscription.stripeCustomerId } : null,
    generations: generationRows.map((row) => ({ id: row.id, model: row.model, credits: row.credits, status: row.status, images: row.images ?? [] })),
  };
}

export async function loadAdminBilling(limit = 50): Promise<Pick<BillingSnapshot, 'orders' | 'generations'>> {
  const db = getDb();
  if (!db) return { orders: [], generations: [] };
  const [orderRows, generationRows] = await Promise.all([
    db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit),
    db.select().from(generations).orderBy(desc(generations.createdAt)).limit(limit),
  ]);
  return {
    orders: orderRows.map((row) => ({ orderNo: row.orderNo, amount: row.amount, credits: row.credits, status: row.status, productId: row.productId })),
    generations: generationRows.map((row) => ({ id: row.id, model: row.model, credits: row.credits, status: row.status, images: row.images ?? [] })),
  };
}
