'use client';

import { useEffect, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { FaGithub } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';

type OAuthProvider = 'google' | 'github';

export function SignInDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('OpenPrompts.login');
  const [busyProvider, setBusyProvider] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const chooseProvider = async (provider: OAuthProvider) => {
    setBusyProvider(provider);
    try {
      await signIn(provider, { callbackUrl: window.location.href });
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[210] grid place-items-center bg-black/45 p-5 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="sign-in-dialog-title"
        className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--text)] shadow-[0_24px_70px_rgba(17,17,17,0.27)]"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 id="sign-in-dialog-title" className="text-lg font-semibold">{t('tabLogin')}</h2>
            <p className="mt-1 text-sm text-[var(--text3)]">{t('welcomeSubtitleOauth')}</p>
          </div>
          <button
            type="button"
            className="h-8 w-8 shrink-0 text-2xl leading-none text-[var(--text3)]"
            aria-label={t('close')}
            onClick={onClose}
          >
            ×
          </button>
        </header>

        <div className="mt-5 grid gap-3">
          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] px-4 py-3 text-sm font-semibold transition hover:border-[var(--amber)] disabled:cursor-wait disabled:opacity-60"
            disabled={busyProvider !== null}
            onClick={() => void chooseProvider('google')}
          >
            <FcGoogle aria-hidden="true" className="text-lg" />
            {busyProvider === 'google' ? t('submitBusy') : t('oauthGoogle')}
          </button>
          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] px-4 py-3 text-sm font-semibold transition hover:border-[var(--amber)] disabled:cursor-wait disabled:opacity-60"
            disabled={busyProvider !== null}
            onClick={() => void chooseProvider('github')}
          >
            <FaGithub aria-hidden="true" className="text-lg" />
            {busyProvider === 'github' ? t('submitBusy') : t('oauthGithub')}
          </button>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-[var(--text3)]">{t('disclaimer')}</p>
      </section>
    </div>
  );
}
