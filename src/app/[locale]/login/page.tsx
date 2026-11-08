import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { FaGithub } from 'react-icons/fa';
import { FcGoogle } from 'react-icons/fc';
import { normalizeLocale } from '~/lib/seo/metadata';

function safeCallbackUrl(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  try {
    const requested = new URL(value);
    const configuredOrigin = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000').origin;
    return requested.origin === configuredOrigin ? requested.toString() : fallback;
  } catch {
    return fallback;
  }
}

function csrfTokenFromCookie(value: string | undefined) {
  if (!value) return null;
  try {
    return decodeURIComponent(value).split('|', 1)[0] || null;
  } catch {
    return null;
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}) {
  const { locale: raw } = await params;
  const locale = normalizeLocale(raw);
  const query = await searchParams;
  const fallback = locale === 'en' ? '/' : `/${locale}`;
  const callbackUrl = safeCallbackUrl(query.callbackUrl, fallback);
  const cookieStore = await cookies();
  const csrfToken = csrfTokenFromCookie(
    cookieStore.get('__Host-next-auth.csrf-token')?.value ??
      cookieStore.get('next-auth.csrf-token')?.value,
  );

  if (!csrfToken) {
    redirect(`/api/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const t = await getTranslations({ locale, namespace: 'OpenPrompts.login' });

  return (
    <main className="grid min-h-dvh place-items-center bg-[var(--bg)] p-5 text-[var(--text)]">
      <section
        aria-labelledby="server-sign-in-title"
        className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_24px_70px_rgba(17,17,17,0.27)]"
      >
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 id="server-sign-in-title" className="text-lg font-semibold">{t('tabLogin')}</h1>
            <p className="mt-1 text-sm text-[var(--text3)]">{t('welcomeSubtitleOauth')}</p>
          </div>
          <a href={fallback} className="grid h-8 w-8 shrink-0 place-items-center text-2xl leading-none text-[var(--text3)]" aria-label={t('close')}>
            ×
          </a>
        </header>

        {query.error ? (
          <p className="mt-4 rounded-xl border border-[var(--coral)]/30 bg-[var(--coral)]/10 px-3 py-2 text-sm text-[var(--coral)]">
            {t('errorGeneric')}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3">
          <form action="/api/auth/signin/google" method="post">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <button type="submit" className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] px-4 py-3 text-sm font-semibold transition hover:border-[var(--amber)]">
              <FcGoogle aria-hidden="true" className="text-lg" />
              {t('oauthGoogle')}
            </button>
          </form>
          <form action="/api/auth/signin/github" method="post">
            <input type="hidden" name="csrfToken" value={csrfToken} />
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <button type="submit" className="flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border2)] bg-[var(--surface2)] px-4 py-3 text-sm font-semibold transition hover:border-[var(--amber)]">
              <FaGithub aria-hidden="true" className="text-lg" />
              {t('oauthGithub')}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs leading-relaxed text-[var(--text3)]">{t('disclaimer')}</p>
      </section>
    </main>
  );
}
