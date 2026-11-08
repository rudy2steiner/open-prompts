export type CreditAccount = {
  purchasedBalance: number;
  monthlyBalance: number;
  monthlyExpiresAt: number | null;
  signupGranted: boolean;
};

export type CreditSpend = {
  monthly: number;
  purchased: number;
};

export function emptyCreditAccount(): CreditAccount {
  return { purchasedBalance: 0, monthlyBalance: 0, monthlyExpiresAt: null, signupGranted: false };
}

export function usableMonthly(account: CreditAccount, now: number): number {
  if (account.monthlyExpiresAt == null || account.monthlyExpiresAt <= now) return 0;
  return account.monthlyBalance;
}

export function grantSignup(account: CreditAccount): CreditAccount | 'duplicate' {
  if (account.signupGranted) return 'duplicate';
  return { ...account, purchasedBalance: account.purchasedBalance + 3, signupGranted: true };
}

export function spendCredits(account: CreditAccount, credits: number, now: number): { account: CreditAccount; spent: CreditSpend } | 'insufficient' {
  if (credits <= 0) return 'insufficient';
  const monthly = Math.min(usableMonthly(account, now), credits);
  const purchased = credits - monthly;
  if (account.purchasedBalance < purchased) return 'insufficient';
  return {
    account: {
      ...account,
      monthlyBalance: account.monthlyBalance - monthly,
      purchasedBalance: account.purchasedBalance - purchased,
    },
    spent: { monthly, purchased },
  };
}

export function refundCredits(account: CreditAccount, spent: CreditSpend): CreditAccount {
  return {
    ...account,
    monthlyBalance: account.monthlyBalance + spent.monthly,
    purchasedBalance: account.purchasedBalance + spent.purchased,
  };
}
