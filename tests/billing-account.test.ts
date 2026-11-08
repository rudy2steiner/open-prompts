import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mergeGuestIntoUser } from '../src/lib/billing/merge';
import { authorizeImageDownload } from '../src/lib/billing/download';
import { createPortalLink } from '../src/lib/billing/portal';
import { adminAccess } from '../src/lib/admin/access';
import { PromoBanner } from '../src/components/site/PromoBanner';
import { BillingSummary } from '../src/components/billing/BillingSummary';
import { emptyCreditAccount } from '../src/lib/billing/ledger';
import { userBillingPage, userBillingTab } from '../src/lib/billing/account-view';

const now = Date.parse('2026-11-07T00:00:00Z');

test('guest credits merge once and a second merge does not add them again', () => {
  const guest = { ...emptyCreditAccount(), purchasedBalance: 10, monthlyBalance: 5, monthlyExpiresAt: now + 1000 };
  const first = mergeGuestIntoUser({ alreadyMerged: false, guest, user: emptyCreditAccount(), now });
  assert.notEqual(first, 'duplicate');
  if (first === 'duplicate') return;
  assert.equal(first.user.purchasedBalance, 10);
  assert.equal(first.user.monthlyBalance, 5);
  const second = mergeGuestIntoUser({ alreadyMerged: true, guest, user: first.user, now });
  assert.equal(second, 'duplicate');
});

test('image download allows the owner or an admin and rejects everyone else', () => {
  const base = { generationOwnerId: 'guest-1', status: 'succeeded', images: ['https://cdn.example/a.png'], index: 0 };
  assert.equal(authorizeImageDownload({ ...base, requesterId: 'guest-1', isAdmin: false }).ok, true);
  assert.equal(authorizeImageDownload({ ...base, requesterId: 'user-2', isAdmin: true }).ok, true);
  assert.equal(authorizeImageDownload({ ...base, requesterId: 'user-2', isAdmin: false }).ok, false);
  assert.equal(authorizeImageDownload({ ...base, requesterId: 'guest-1', isAdmin: false, status: 'reserved' }).ok, false);
  assert.equal(authorizeImageDownload({ ...base, requesterId: 'guest-1', isAdmin: false, index: 1 }).ok, false);
});

test('portal and admin access fail closed', async () => {
  assert.equal(await createPortalLink({ customerId: null, returnUrl: 'http://localhost/billing', createSession: async () => 'https://billing.stripe.com' }), 'rejected');
  const opened = await createPortalLink({ customerId: 'cus_1', returnUrl: 'http://localhost/billing', createSession: async (customerId) => `https://billing.stripe.com/${customerId}` });
  assert.equal(opened !== 'rejected' && opened.url, 'https://billing.stripe.com/cus_1');
  assert.equal(adminAccess(false), 'not-found');
  assert.equal(adminAccess(true), 'allowed');
});

test('the promo banner and billing summary render only their own data', () => {
  assert.equal(renderToStaticMarkup(createElement(PromoBanner, { text: '  ' })), '');
  assert.match(renderToStaticMarkup(createElement(PromoBanner, { text: 'Launch week' })), /Launch week/);
  const html = renderToStaticMarkup(createElement(BillingSummary, {
    locale: 'en',
    snapshot: {
      purchasedBalance: 3, monthlyBalance: 0, monthlyExpiresAt: null, usable: 3,
      orders: [{ orderNo: 'o1', amount: 490, credits: 245, status: 'paid', productId: 'one-time' }],
      subscription: null,
      generations: [],
    },
  }));
  assert.match(html, /3 credits/);
  assert.match(html, /one-time/);
  assert.equal(html.includes('Admin download'), false);
});

test('the user billing page stays on orders, credits, and generations', () => {
  assert.equal(userBillingTab('credits'), 'credits');
  assert.equal(userBillingTab('overview'), 'orders');
  assert.equal(userBillingPage('3'), 3);
  assert.equal(userBillingPage('0'), 1);
});
