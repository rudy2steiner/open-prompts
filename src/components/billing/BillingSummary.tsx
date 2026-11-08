'use client';

import { useState } from 'react';
import type { BillingSnapshot } from '~/lib/billing/summary';

export function BillingSummary({ locale, snapshot, showAdminDownloads = false }: { locale: string; snapshot: BillingSnapshot; showAdminDownloads?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const buy = async (planId: string) => {
    const response = await fetch('/api/checkout', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ planId, locale, paymentMethod: 'card' }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.url !== 'string') {
      setError('Checkout is unavailable');
      return;
    }
    window.location.assign(body.url);
  };
  const portal = async () => {
    const response = await fetch('/api/billing/portal', { method: 'POST' });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.url !== 'string') {
      setError('Portal is unavailable');
      return;
    }
    window.location.assign(body.url);
  };
  return (
    <section className="space-y-4 text-sm text-stone-800">
      <p data-usable-credits>{snapshot.usable} credits</p>
      <p>{snapshot.purchasedBalance} purchased · {snapshot.monthlyBalance} monthly</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => buy('one-time')}>Buy $4.90</button>
        <button type="button" onClick={() => buy('one-time-9')}>Buy $9.90</button>
        <button type="button" onClick={() => buy('one-time-19')}>Buy $19.90</button>
        <button type="button" onClick={() => buy('monthly')}>Subscribe $9.90</button>
        <button type="button" onClick={portal}>Manage subscription</button>
      </div>
      <p>{snapshot.subscription ? snapshot.subscription.status : 'no subscription'}</p>
      <ul>
        {snapshot.orders.map((order) => <li key={order.orderNo}>{order.productId} · {order.status} · {order.credits}</li>)}
      </ul>
      <ul>
        {snapshot.generations.map((generation) => (
          <li key={generation.id}>
            {generation.model} · {generation.credits}
            {generation.images.map((image, index) => (
              <a key={image} href={`/api/generations/${generation.id}/images/${index}`} download>{showAdminDownloads ? 'Admin download' : 'Download'}</a>
            ))}
          </li>
        ))}
      </ul>
      {error ? <p>{error}</p> : null}
    </section>
  );
}
