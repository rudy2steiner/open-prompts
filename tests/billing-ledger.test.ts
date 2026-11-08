import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { emptyCreditAccount, grantSignup, refundCredits, spendCredits, type CreditAccount } from '../src/lib/billing/ledger';

const now = Date.parse('2026-11-07T00:00:00Z');

function withBalances(input: Partial<CreditAccount>): CreditAccount {
  return { ...emptyCreditAccount(), ...input };
}

test('first login grants 3 purchased credits once', () => {
  const first = grantSignup(emptyCreditAccount());
  assert.notEqual(first, 'duplicate');
  if (first === 'duplicate') return;
  assert.equal(first.purchasedBalance, 3);
  assert.equal(grantSignup(first), 'duplicate');
});

test('monthly credits are spent before purchased credits', () => {
  const account = withBalances({ purchasedBalance: 4, monthlyBalance: 2, monthlyExpiresAt: now + 1000 });
  const spent = spendCredits(account, 3, now);
  assert.notEqual(spent, 'insufficient');
  if (spent === 'insufficient') return;
  assert.deepEqual(spent.spent, { monthly: 2, purchased: 1 });
  assert.equal(spent.account.monthlyBalance, 0);
  assert.equal(spent.account.purchasedBalance, 3);
});

test('expired monthly credits are not spent', () => {
  const account = withBalances({ purchasedBalance: 1, monthlyBalance: 5, monthlyExpiresAt: now });
  assert.equal(spendCredits(account, 2, now), 'insufficient');
  assert.equal(account.purchasedBalance, 1);
});

test('partial monthly balance still needs purchased credits', () => {
  const account = withBalances({ purchasedBalance: 1, monthlyBalance: 1, monthlyExpiresAt: now + 1000 });
  const spent = spendCredits(account, 2, now);
  assert.notEqual(spent, 'insufficient');
  if (spent === 'insufficient') return;
  assert.deepEqual(spent.spent, { monthly: 1, purchased: 1 });
});

test('insufficient balance does not change the account', () => {
  const account = withBalances({ purchasedBalance: 1, monthlyBalance: 0, monthlyExpiresAt: null });
  assert.equal(spendCredits(account, 2, now), 'insufficient');
});

test('a failed generation refunds the original split', () => {
  const account = withBalances({ purchasedBalance: 4, monthlyBalance: 2, monthlyExpiresAt: now + 1000 });
  const spent = spendCredits(account, 3, now);
  if (spent === 'insufficient') throw new Error('expected a spend');
  const refunded = refundCredits(spent.account, spent.spent);
  assert.equal(refunded.purchasedBalance, 4);
  assert.equal(refunded.monthlyBalance, 2);
});
