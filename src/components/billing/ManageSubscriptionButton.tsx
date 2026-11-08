'use client';

import { useState } from 'react';

export function ManageSubscriptionButton({ label }: { label: string }) {
  const [error, setError] = useState(false);
  const open = async () => {
    setError(false);
    try {
      const response = await fetch('/api/billing/portal', { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || typeof body.url !== 'string') throw new Error('portal');
      window.location.assign(body.url);
    } catch {
      setError(true);
    }
  };
  return (
    <div>
      <button type="button" className="rounded-full border border-[var(--border)] px-4 py-2 text-sm" onClick={() => void open()}>{label}</button>
      {error ? <p className="mt-2 text-xs text-[var(--coral)]">{label}</p> : null}
    </div>
  );
}
