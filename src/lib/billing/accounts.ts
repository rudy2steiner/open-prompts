import { eq } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { creditAccounts, creditTransactions, generations } from '~/db/schema';
import { emptyCreditAccount, refundCredits, spendCredits, usableMonthly, type CreditAccount, type CreditSpend } from './ledger';

function toAccount(row: { purchasedBalance: number; monthlyBalance: number; monthlyExpiresAt: Date | null } | undefined): CreditAccount {
  return {
    purchasedBalance: row?.purchasedBalance ?? 0,
    monthlyBalance: row?.monthlyBalance ?? 0,
    monthlyExpiresAt: row?.monthlyExpiresAt?.getTime() ?? null,
    signupGranted: false,
  };
}

export async function readCreditAccount(ownerId: string): Promise<CreditAccount | null> {
  const db = getDb();
  if (!db) return null;
  const row = await db.select().from(creditAccounts).where(eq(creditAccounts.ownerId, ownerId)).get();
  return toAccount(row);
}

export function usableBalance(account: CreditAccount, now = Date.now()): number {
  return account.purchasedBalance + usableMonthly(account, now);
}

export async function persistGenerationCharge(input: {
  ownerId: string;
  generationId: string;
  model: string;
  credits: number;
  now?: number;
}): Promise<{ spent: CreditSpend } | 'insufficient' | 'unavailable'> {
  const db = getDb();
  if (!db) return 'unavailable';
  const now = input.now ?? Date.now();
  const current = toAccount(await db.select().from(creditAccounts).where(eq(creditAccounts.ownerId, input.ownerId)).get());
  const spent = spendCredits(current, input.credits, now);
  if (spent === 'insufficient') return 'insufficient';
  await db.insert(creditAccounts).values({
    ownerId: input.ownerId,
    purchasedBalance: spent.account.purchasedBalance,
    monthlyBalance: spent.account.monthlyBalance,
    monthlyExpiresAt: spent.account.monthlyExpiresAt ? new Date(spent.account.monthlyExpiresAt) : null,
  }).onConflictDoUpdate({
    target: creditAccounts.ownerId,
    set: {
      purchasedBalance: spent.account.purchasedBalance,
      monthlyBalance: spent.account.monthlyBalance,
      monthlyExpiresAt: spent.account.monthlyExpiresAt ? new Date(spent.account.monthlyExpiresAt) : null,
      updatedAt: new Date(now),
    },
  });
  await db.insert(generations).values({
    id: input.generationId,
    ownerId: input.ownerId,
    model: input.model,
    credits: input.credits,
    monthlyCredits: spent.spent.monthly,
    purchasedCredits: spent.spent.purchased,
    status: 'reserved',
    images: [],
  });
  const writes = [
    spent.spent.monthly ? { amount: -spent.spent.monthly, pool: 'monthly' as const, balanceAfter: spent.account.monthlyBalance } : null,
    spent.spent.purchased ? { amount: -spent.spent.purchased, pool: 'purchased' as const, balanceAfter: spent.account.purchasedBalance } : null,
  ].filter((row): row is { amount: number; pool: 'monthly' | 'purchased'; balanceAfter: number } => Boolean(row));
  if (writes.length) {
    await db.insert(creditTransactions).values(writes.map((row) => ({
      ownerId: input.ownerId,
      amount: row.amount,
      kind: 'reserve' as const,
      referenceId: input.generationId,
      idempotencyKey: `reserve:${input.generationId}:${row.pool}`,
      balanceAfter: row.balanceAfter,
      pool: row.pool,
    })));
  }
  return { spent: spent.spent };
}

export async function markGenerationSucceeded(generationId: string, ownerId: string, images: string[]): Promise<void> {
  const db = getDb();
  if (!db || images.length === 0) return;
  const generation = await db.select().from(generations).where(eq(generations.id, generationId)).get();
  if (!generation || generation.ownerId !== ownerId || generation.status === 'failed') return;
  await db.update(generations).set({ status: 'succeeded', images }).where(eq(generations.id, generationId));
}

export async function refundGenerationCharge(generationId: string): Promise<void> {
  const db = getDb();
  if (!db) return;
  const generation = await db.select().from(generations).where(eq(generations.id, generationId)).get();
  if (!generation || generation.status === 'failed') return;
  const current = toAccount(await db.select().from(creditAccounts).where(eq(creditAccounts.ownerId, generation.ownerId)).get()) ?? emptyCreditAccount();
  const restored = refundCredits(current, { monthly: generation.monthlyCredits, purchased: generation.purchasedCredits });
  await db.update(creditAccounts).set({
    purchasedBalance: restored.purchasedBalance,
    monthlyBalance: restored.monthlyBalance,
    updatedAt: new Date(),
  }).where(eq(creditAccounts.ownerId, generation.ownerId));
  await db.update(generations).set({ status: 'failed' }).where(eq(generations.id, generationId));
  const writes = [
    generation.monthlyCredits ? { amount: generation.monthlyCredits, pool: 'monthly' as const, balanceAfter: restored.monthlyBalance } : null,
    generation.purchasedCredits ? { amount: generation.purchasedCredits, pool: 'purchased' as const, balanceAfter: restored.purchasedBalance } : null,
  ].filter((row): row is { amount: number; pool: 'monthly' | 'purchased'; balanceAfter: number } => Boolean(row));
  if (writes.length) {
    await db.insert(creditTransactions).values(writes.map((row) => ({
      ownerId: generation.ownerId,
      amount: row.amount,
      kind: 'refund' as const,
      referenceId: generationId,
      idempotencyKey: `refund:${generationId}:${row.pool}`,
      balanceAfter: row.balanceAfter,
      pool: row.pool,
    })));
  }
}
