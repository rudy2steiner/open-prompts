import { and, desc, eq } from 'drizzle-orm';
import { getDb } from '~/db/client';
import { creditAccounts, creditTransactions, generations, guestSessions, orders, subscriptions } from '~/db/schema';
import { hashGuestToken } from './guest';
import { grantSignup, usableMonthly, type CreditAccount } from './ledger';
import { mergeGuestIntoUser } from './merge';

function toAccount(row: { purchasedBalance: number; monthlyBalance: number; monthlyExpiresAt: Date | null } | undefined, signupGranted: boolean): CreditAccount {
  return {
    purchasedBalance: row?.purchasedBalance ?? 0,
    monthlyBalance: row?.monthlyBalance ?? 0,
    monthlyExpiresAt: row?.monthlyExpiresAt?.getTime() ?? null,
    signupGranted,
  };
}

export async function grantSignupOnce(userId: string): Promise<'granted' | 'duplicate' | 'unavailable'> {
  const db = getDb();
  if (!db) return 'unavailable';
  const key = `signup:${userId}`;
  const existing = await db.select({ id: creditTransactions.id }).from(creditTransactions).where(eq(creditTransactions.idempotencyKey, key)).get();
  if (existing) return 'duplicate';
  const row = await db.select().from(creditAccounts).where(eq(creditAccounts.ownerId, userId)).get();
  const granted = grantSignup(toAccount(row, false));
  if (granted === 'duplicate') return 'duplicate';
  await db.insert(creditAccounts).values({ ownerId: userId, purchasedBalance: granted.purchasedBalance, monthlyBalance: granted.monthlyBalance })
    .onConflictDoUpdate({ target: creditAccounts.ownerId, set: { purchasedBalance: granted.purchasedBalance, updatedAt: new Date() } });
  await db.insert(creditTransactions).values({
    ownerId: userId, amount: 3, kind: 'signup', referenceId: userId, idempotencyKey: key,
    balanceAfter: granted.purchasedBalance, pool: 'purchased',
  });
  return 'granted';
}

export async function mergeGuestLedger(userId: string, guestToken: string | null, now = Date.now()): Promise<'merged' | 'duplicate' | 'skipped' | 'unavailable'> {
  if (!guestToken) return 'skipped';
  const db = getDb();
  if (!db) return 'unavailable';
  const guest = await db.select({ guestId: guestSessions.guestId, expiresAt: guestSessions.expiresAt })
    .from(guestSessions).where(eq(guestSessions.tokenHash, await hashGuestToken(guestToken))).get();
  if (!guest || guest.expiresAt.getTime() <= now || guest.guestId === userId) return 'skipped';
  const key = `merge:${guest.guestId}`;
  const existing = await db.select({ id: creditTransactions.id }).from(creditTransactions).where(eq(creditTransactions.idempotencyKey, key)).get();
  if (existing) return 'duplicate';
  const [guestRow, userRow, signup] = await Promise.all([
    db.select().from(creditAccounts).where(eq(creditAccounts.ownerId, guest.guestId)).get(),
    db.select().from(creditAccounts).where(eq(creditAccounts.ownerId, userId)).get(),
    db.select({ id: creditTransactions.id }).from(creditTransactions).where(eq(creditTransactions.idempotencyKey, `signup:${userId}`)).get(),
  ]);
  const merged = mergeGuestIntoUser({
    alreadyMerged: false,
    guest: toAccount(guestRow, false),
    user: toAccount(userRow, Boolean(signup)),
    now,
  });
  if (merged === 'duplicate') return 'duplicate';
  await db.insert(creditAccounts).values({
    ownerId: userId,
    purchasedBalance: merged.user.purchasedBalance,
    monthlyBalance: merged.user.monthlyBalance,
    monthlyExpiresAt: merged.user.monthlyExpiresAt ? new Date(merged.user.monthlyExpiresAt) : null,
  }).onConflictDoUpdate({
    target: creditAccounts.ownerId,
    set: {
      purchasedBalance: merged.user.purchasedBalance,
      monthlyBalance: merged.user.monthlyBalance,
      monthlyExpiresAt: merged.user.monthlyExpiresAt ? new Date(merged.user.monthlyExpiresAt) : null,
      updatedAt: new Date(now),
    },
  });
  if (guestRow) {
    await db.update(creditAccounts).set({ purchasedBalance: 0, monthlyBalance: 0, monthlyExpiresAt: null, updatedAt: new Date(now) }).where(eq(creditAccounts.ownerId, guest.guestId));
  }
  await db.update(orders).set({ ownerId: userId, updatedAt: new Date(now) }).where(eq(orders.ownerId, guest.guestId));
  await db.update(subscriptions).set({ ownerId: userId, updatedAt: new Date(now) }).where(eq(subscriptions.ownerId, guest.guestId));
  await db.update(generations).set({ ownerId: userId }).where(and(eq(generations.ownerId, guest.guestId)));
  const amount = merged.movedPurchased + merged.movedMonthly;
  if (amount > 0) {
    await db.insert(creditTransactions).values({
      ownerId: userId, amount, kind: 'merge', referenceId: guest.guestId, idempotencyKey: key,
      balanceAfter: merged.user.purchasedBalance + usableMonthly(merged.user, now), pool: merged.movedPurchased > 0 ? 'purchased' : 'monthly',
    });
  } else {
    await db.update(guestSessions).set({ expiresAt: new Date(now) }).where(eq(guestSessions.guestId, guest.guestId));
  }
  return 'merged';
}

export async function settleLoginLedger(userId: string, guestToken: string | null): Promise<void> {
  await grantSignupOnce(userId);
  await mergeGuestLedger(userId, guestToken);
}
