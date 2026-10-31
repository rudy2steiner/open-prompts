'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

export function MotionCopyButton({ prompt }: { prompt: string }) {
  const t = useTranslations('OpenPrompts.promptMotionPage');
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  async function copy() {
    clearTimeout(timer.current);
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus('copied');
      timer.current = setTimeout(() => setStatus('idle'), 2000);
    } catch { setStatus('error'); }
  }
  return <div className="motion-copy-control">
    <button type="button" className="motion-copy-button" aria-label={status === 'copied' ? t('copied') : t('copy')} title={t('copy')} onClick={() => void copy()}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {status === 'copied' ? <path d="m5 12 4 4L19 6" /> : <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>}
      </svg>
    </button>
    <p className={status === 'error' ? 'motion-copy-status' : 'sr-only'} role="status">{status === 'error' ? t('copyError') : status === 'copied' ? t('copied') : ''}</p>
  </div>;
}
