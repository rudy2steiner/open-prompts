import { desc, eq } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { creditAccounts, creditTransactions, generations, orders, subscriptions } from '~/db/schema';
import { usableMonthly } from './ledger';

export const USER_BILLING_PAGE_SIZE = 10;
export type UserBillingTab = 'orders' | 'credits' | 'generations';

export type UserOrderRow = { orderNo: string; productName: string; credits: number; amount: number; currency: string; status: string; createdAt: number };
export type UserCreditRow = { id: string; amount: number; kind: string; balanceAfter: number; createdAt: number };
export type UserGenerationRow = { id: string; model: string; credits: number; status: string; images: string[]; createdAt: number };

export type UserBillingSummary = {
  usable: number;
  purchased: number;
  monthly: number;
  monthlyExpiresAt: number | null;
  subscription: { status: string; currentPeriodEnd: number | null } | null;
};

export function userBillingTab(value: string | undefined): UserBillingTab {
  return value === 'credits' || value === 'generations' ? value : 'orders';
}

export function userBillingPage(value: string | undefined): number {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

const emptySummary: UserBillingSummary = { usable: 0, purchased: 0, monthly: 0, monthlyExpiresAt: null, subscription: null };

export async function loadUserBilling(ownerId: string, tab: UserBillingTab, page: number, now = Date.now()) {
  const db = getDb();
  const offset = (page - 1) * USER_BILLING_PAGE_SIZE;
  const limit = USER_BILLING_PAGE_SIZE + 1;
  if (!db) return { summary: emptySummary, orders: [] as UserOrderRow[], credits: [] as UserCreditRow[], generations: [] as UserGenerationRow[], hasNext: false };
  const [account, subscription] = await Promise.all([
    db.select().from(creditAccounts).where(eq(creditAccounts.ownerId, ownerId)).get(),
    db.select().from(subscriptions).where(eq(subscriptions.ownerId, ownerId)).orderBy(desc(subscriptions.updatedAt)).get(),
  ]);
  const purchased = account?.purchasedBalance ?? 0;
  const monthlyExpiresAt = account?.monthlyExpiresAt?.getTime() ?? null;
  const monthly = usableMonthly({ purchasedBalance: purchased, monthlyBalance: account?.monthlyBalance ?? 0, monthlyExpiresAt, signupGranted: false }, now);
  const summary: UserBillingSummary = {
    usable: purchased + monthly,
    purchased,
    monthly,
    monthlyExpiresAt,
    subscription: subscription ? { status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd?.getTime() ?? null } : null,
  };
  if (tab === 'credits') {
    const rows = await db.select().from(creditTransactions).where(eq(creditTransactions.ownerId, ownerId)).orderBy(desc(creditTransactions.createdAt)).limit(limit).offset(offset);
    return { summary, orders: [], credits: rows.slice(0, USER_BILLING_PAGE_SIZE).map((row) => ({ id: row.id, amount: row.amount, kind: row.kind, balanceAfter: row.balanceAfter, createdAt: row.createdAt.getTime() })), generations: [], hasNext: rows.length > USER_BILLING_PAGE_SIZE };
  }
  if (tab === 'generations') {
    const rows = await db.select().from(generations).where(eq(generations.ownerId, ownerId)).orderBy(desc(generations.createdAt)).limit(limit).offset(offset);
    return { summary, orders: [], credits: [], generations: rows.slice(0, USER_BILLING_PAGE_SIZE).map((row) => ({ id: row.id, model: row.model, credits: row.credits, status: row.status, images: row.images ?? [], createdAt: row.createdAt.getTime() })), hasNext: rows.length > USER_BILLING_PAGE_SIZE };
  }
  const rows = await db.select().from(orders).where(eq(orders.ownerId, ownerId)).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
  return {
    summary,
    orders: rows.slice(0, USER_BILLING_PAGE_SIZE).map((row) => ({ orderNo: row.orderNo, productName: row.productName, credits: row.credits, amount: row.amount, currency: row.currency, status: row.status, createdAt: row.createdAt.getTime() })),
    credits: [],
    generations: [],
    hasNext: rows.length > USER_BILLING_PAGE_SIZE,
  };
}
