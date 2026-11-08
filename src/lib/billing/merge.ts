import { usableMonthly, type CreditAccount } from './ledger';

export function mergeGuestIntoUser(input: {
  alreadyMerged: boolean;
  guest: CreditAccount;
  user: CreditAccount;
  now: number;
}): { user: CreditAccount; movedPurchased: number; movedMonthly: number } | 'duplicate' {
  if (input.alreadyMerged) return 'duplicate';
  const movedMonthly = usableMonthly(input.guest, input.now);
  const userMonthly = usableMonthly(input.user, input.now);
  const expiry = movedMonthly > 0
    ? Math.max(input.user.monthlyExpiresAt ?? 0, input.guest.monthlyExpiresAt ?? 0)
    : input.user.monthlyExpiresAt;
  return {
    movedPurchased: input.guest.purchasedBalance,
    movedMonthly,
    user: {
      ...input.user,
      purchasedBalance: input.user.purchasedBalance + input.guest.purchasedBalance,
      monthlyBalance: userMonthly + movedMonthly,
      monthlyExpiresAt: expiry,
    },
  };
}
