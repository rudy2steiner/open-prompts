'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function generationBillingOffer(error: string | null | undefined): boolean {
  return error === 'unpriced' || error === 'no_identity' || error === 'insufficient';
}

export function GenerationBillingPrompt({
  open,
  onClose,
  onLogin,
  onGuest,
  copy,
}: {
  open: boolean;
  onClose: () => void;
  onLogin: () => void;
  onGuest: () => void;
  copy: { title: string; body: string; login: string; guest: string; close: string };
}) {
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open, onClose]);

  if (!open) return null;
  const dialog = (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/45 p-5 backdrop-blur-sm" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="relative w-full max-w-[430px] rounded-[14px] border border-[var(--border)] bg-[var(--surface)] p-7 text-left text-[var(--text)] shadow-[0_24px_70px_rgba(17,17,17,0.27)]" role="dialog" aria-modal="true" aria-labelledby="generation-auth-title">
        <button type="button" className="absolute right-4 top-3.5 h-8 w-8 text-2xl leading-none text-[var(--text3)]" aria-label={copy.close} onClick={onClose}>×</button>
        <h2 id="generation-auth-title" className="pr-10 text-[23px] font-semibold leading-tight">{copy.title}</h2>
        <p className="mt-2.5 text-sm leading-relaxed text-[var(--text3)]">{copy.body}</p>
        <div className="mt-6 grid gap-2.5">
          <button type="button" className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--border2)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold" onClick={onLogin}>
            <svg className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" fill="#EA4335" />
            </svg>
            {copy.login}
          </button>
          <button type="button" className="w-full rounded-md border border-[var(--border2)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold" onClick={onGuest}>{copy.guest}</button>
        </div>
      </section>
    </div>
  );
  if (typeof document === 'undefined') return dialog;
  return createPortal(dialog, document.body);
}
