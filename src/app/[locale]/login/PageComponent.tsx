'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import { CoverImage } from '~/components/prompt-gallery/CoverImage';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';

function homeHref(locale: string) {
  return locale === 'en' ? '/' : `/${locale}`;
}

/** Always three slots for the left stack; cycles prompts if fewer than three exist. */
function stackThree<T>(items: T[]): T[] {
  if (items.length === 0) return [];
  const out: T[] = [];
  for (let i = 0; i < 3; i++) out.push(items[i % items.length]);
  return out;
}

export type LoginPreviewPrompt = { id: string; title: string; coverSrc: string };

export type LoginPageProps = {
  locale: string;
  authProviders: { github: boolean; google: boolean };
  previewPrompts: LoginPreviewPrompt[];
};

export default function PageComponent({ locale, authProviders, previewPrompts }: LoginPageProps) {
  const t = useTranslations('OpenPrompts.login');
  const searchParams = useSearchParams();
  const errorCode = searchParams?.get('error') ?? null;

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwVisible, setPwVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);
  const [resendLabel, setResendLabel] = useState<'idle' | 'sent'>('idle');

  const callbackUrl = useMemo(() => homeHref(locale), [locale]);
  const stackPrompts = useMemo(() => stackThree(previewPrompts), [previewPrompts]);

  const mapAuthError = useCallback(() => {
    if (errorCode === 'CredentialsSignin') return t('errorCredentials');
    if (errorCode) return t('errorGeneric');
    return null;
  }, [errorCode, t]);

  const urlError = useMemo(() => mapAuthError(), [mapAuthError]);

  const onOAuth = async (provider: 'github' | 'google') => {
    setFormError(null);
    setBusy(true);
    try {
      await signIn(provider, { callbackUrl });
    } finally {
      setBusy(false);
    }
  };

  const onSubmit = async () => {
    setFormError(null);
    setBusy(true);
    try {
      if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, name: name || undefined }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setFormError(data.error || t('errorRegister'));
          return;
        }
        const signInRes = await signIn('credentials', {
          email,
          password,
          callbackUrl,
          redirect: false,
        });
        if (signInRes?.error) {
          setFormError(t('errorCredentials'));
          return;
        }
        if (signInRes?.ok && signInRes.url) {
          window.location.assign(signInRes.url);
        }
        return;
      }

      const signInRes = await signIn('credentials', {
        email,
        password,
        callbackUrl,
        redirect: false,
      });
      if (signInRes?.error) {
        setFormError(t('errorCredentials'));
        return;
      }
      if (signInRes?.ok && signInRes.url) {
        window.location.assign(signInRes.url);
      }
    } finally {
      setBusy(false);
    }
  };

  const showForgot = (e: React.MouseEvent) => {
    e.preventDefault();
    setMagicSent(true);
  };

  const combinedError = formError || urlError;

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-[var(--bg)]">
      <OpenPromptsSiteHeader locale={locale} activeNav="login" langPathSuffix="/login" />

      <main className="relative isolate flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-0 pt-0">
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.028]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="pointer-events-none fixed -top-[280px] left-1/2 -z-10 h-[500px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(232,160,32,0.09)_0%,transparent_68%)]" />
        <div className="pointer-events-none fixed left-[-200px] top-[30%] -z-10 h-[500px] w-[500px] bg-[radial-gradient(ellipse_at_center,rgba(45,180,160,0.05)_0%,transparent_70%)]" />
        <div className="pointer-events-none fixed right-[-200px] top-[40%] -z-10 h-[500px] w-[500px] bg-[radial-gradient(ellipse_at_center,rgba(232,160,32,0.04)_0%,transparent_70%)]" />

        <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden border border-[var(--border2)]">
          <div className="grid min-h-0 w-full flex-1 gap-0 overflow-hidden md:grid-cols-2">
            {/* Left — three stacked cards (real prompt covers from gallery) */}
            <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#0f0e0c] to-[#131108] p-6 md:flex md:border-r md:border-[var(--border)]">
              <div
                className="pointer-events-none absolute inset-0 opacity-100"
                style={{
                  backgroundImage: `linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)`,
                  backgroundSize: '48px 48px',
                  maskImage: 'radial-gradient(ellipse at 30% 50%, black 30%, transparent 75%)',
                }}
              />

              <div className="relative z-[1] flex flex-1 items-center justify-center py-6">
                <div className="group/cardstack relative h-[168px] w-full max-w-[320px]">
                  {stackPrompts.length > 0 ? (
                    <>
                      <Link
                        href={homeHref(locale)}
                        title={stackPrompts[0].title}
                        className="absolute left-1/2 top-1/2 z-[1] w-[240px] -translate-x-[calc(50%+60px)] -translate-y-1/2 rotate-[-6deg] rounded-none border border-[var(--border2)] bg-[var(--surface)] opacity-70 shadow-[0_24px_60px_rgba(0,0,0,0.5)] transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-90 group-hover/cardstack:-translate-x-[calc(50%+70px)] group-hover/cardstack:rotate-[-8deg]"
                      >
                        <div className="relative h-[118px] w-full overflow-hidden bg-[var(--surface2)]">
                          <CoverImage
                            src={stackPrompts[0].coverSrc}
                            alt={stackPrompts[0].title}
                            sizes="240px"
                            className="object-cover"
                            priority
                          />
                        </div>
                        <div className="border-t border-[var(--border)] px-2.5 py-2">
                          <div className="truncate text-xs font-medium leading-snug text-[var(--text)]">{stackPrompts[0].title}</div>
                        </div>
                      </Link>
                      <Link
                        href={homeHref(locale)}
                        title={stackPrompts[1].title}
                        className="absolute left-1/2 top-1/2 z-[3] w-[240px] -translate-x-1/2 -translate-y-1/2 rotate-[2deg] rounded-none border border-[var(--border2)] bg-[var(--surface)] shadow-[0_24px_60px_rgba(0,0,0,0.5)] transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/cardstack:scale-[1.02]"
                      >
                        <div className="relative h-[118px] w-full overflow-hidden bg-[var(--surface2)]">
                          <CoverImage
                            src={stackPrompts[1].coverSrc}
                            alt={stackPrompts[1].title}
                            sizes="240px"
                            className="object-cover"
                          />
                        </div>
                        <div className="border-t border-[var(--border)] px-2.5 py-2">
                          <div className="truncate text-xs font-medium leading-snug text-[var(--text)]">{stackPrompts[1].title}</div>
                        </div>
                      </Link>
                      <Link
                        href={homeHref(locale)}
                        title={stackPrompts[2].title}
                        className="absolute left-1/2 top-1/2 z-[2] w-[240px] -translate-x-[calc(50%-55px)] -translate-y-1/2 rotate-[8deg] rounded-none border border-[var(--border2)] bg-[var(--surface)] opacity-65 shadow-[0_24px_60px_rgba(0,0,0,0.5)] transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-80 group-hover/cardstack:-translate-x-[calc(50%-65px)] group-hover/cardstack:rotate-[10deg]"
                      >
                        <div className="relative h-[118px] w-full overflow-hidden bg-[var(--surface2)]">
                          <CoverImage
                            src={stackPrompts[2].coverSrc}
                            alt={stackPrompts[2].title}
                            sizes="240px"
                            className="object-cover"
                          />
                        </div>
                        <div className="border-t border-[var(--border)] px-2.5 py-2">
                          <div className="truncate text-xs font-medium leading-snug text-[var(--text)]">{stackPrompts[2].title}</div>
                        </div>
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="absolute left-1/2 top-1/2 z-[1] w-[240px] -translate-x-[calc(50%+60px)] -translate-y-1/2 rotate-[-6deg] rounded-none border border-[var(--border2)] bg-[var(--surface)] opacity-50 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
                        <div className="grid h-[118px] place-items-center bg-[var(--surface2)] text-[10px] text-[var(--text3)]">—</div>
                        <div className="border-t border-[var(--border)] px-2.5 py-2 text-xs text-[var(--text3)]">—</div>
                      </div>
                      <div className="absolute left-1/2 top-1/2 z-[3] w-[240px] -translate-x-1/2 -translate-y-1/2 rotate-[2deg] rounded-none border border-[var(--border2)] bg-[var(--surface)] opacity-60 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
                        <div className="grid h-[118px] place-items-center bg-[var(--surface2)] text-[10px] text-[var(--text3)]">—</div>
                        <div className="border-t border-[var(--border)] px-2.5 py-2 text-xs text-[var(--text3)]">—</div>
                      </div>
                      <div className="absolute left-1/2 top-1/2 z-[2] w-[240px] -translate-x-[calc(50%-55px)] -translate-y-1/2 rotate-[8deg] rounded-none border border-[var(--border2)] bg-[var(--surface)] opacity-50 shadow-[0_24px_60px_rgba(0,0,0,0.5)]">
                        <div className="grid h-[118px] place-items-center bg-[var(--surface2)] text-[10px] text-[var(--text3)]">—</div>
                        <div className="border-t border-[var(--border)] px-2.5 py-2 text-xs text-[var(--text3)]">—</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="relative z-[1]">
                <h2 className="font-serif text-2xl leading-tight tracking-tight text-[var(--text)] md:text-[28px]">
                  {locale === 'zh' ? (
                    <>
                      社区精选提示词
                      <br />
                      一键<span className="italic text-[var(--amber2)]">生图</span>，开箱即用
                    </>
                  ) : (
                    <>
                      Curated prompts.
                      <br />
                      <span className="italic text-[var(--amber2)]">Generate</span> in one click.
                    </>
                  )}
                </h2>
                <p className="mt-2.5 max-w-[340px] text-[13px] font-light leading-relaxed text-[var(--text2)]">
                  {locale === 'zh'
                    ? '汇聚来自 X、社区投递的高质量 AI 生图提示词，支持多模型，开源可私有部署。'
                    : 'High-quality image prompts from the community and social feeds. Multi-model support, MIT licensed.'}
                </p>
                <div className="mt-4 flex">
                  <div className="pr-6">
                    <div className="font-serif text-lg text-[var(--amber2)]">12,400+</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--text3)]">
                      {locale === 'zh' ? '提示词' : 'Prompts'}
                    </div>
                  </div>
                  <div className="border-l border-[var(--border)] px-6">
                    <div className="font-serif text-lg text-[var(--amber2)]">38</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--text3)]">
                      {locale === 'zh' ? '支持模型' : 'Models'}
                    </div>
                  </div>
                  <div className="border-l border-[var(--border)] pl-6">
                    <div className="font-serif text-lg text-[var(--amber2)]">MIT</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--text3)]">
                      {locale === 'zh' ? '开源协议' : 'License'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — auth */}
            <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-6 pt-14">
              <div className="absolute left-6 top-4 z-10">
                <Link
                  href={homeHref(locale)}
                  className="inline-flex items-center rounded-none border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text2)] transition hover:border-[var(--border2)] hover:text-[var(--text)]"
                >
                  <span className="mr-1.5" aria-hidden>
                    ‹
                  </span>
                  {t('backGallery')}
                </Link>
              </div>

              <div className="w-full max-w-[380px] animate-[fadeUp_0.5s_ease_both] pt-8">
              <style jsx global>{`
                @keyframes fadeUp {
                  from {
                    opacity: 0;
                    transform: translateY(18px);
                  }
                  to {
                    opacity: 1;
                    transform: translateY(0);
                  }
                }
              `}</style>

              <div className="mb-8 text-center">
                <h1 className="font-serif text-[26px] leading-snug tracking-tight text-[var(--text)]">
                  {t('welcomeLine1')}
                  <br />
                  {t('welcomeBrandOpen')}{' '}
                  <span className="italic text-[var(--amber2)]">{t('welcomeBrandEm')}</span>
                </h1>
                <p className="mt-1.5 text-[13px] font-light leading-relaxed text-[var(--text2)]">{t('welcomeSubtitle')}</p>
              </div>

              <div className="mb-7 flex rounded-none border border-[var(--border)] bg-[var(--surface)]">
                <button
                  type="button"
                  className={`flex-1 rounded-none border-0 border-r border-[var(--border)] py-2 text-[13px] transition ${
                    mode === 'login'
                      ? 'bg-[var(--surface2)] text-[var(--text)]'
                      : 'text-[var(--text2)]'
                  }`}
                  onClick={() => {
                    setMode('login');
                    setMagicSent(false);
                    setFormError(null);
                  }}
                >
                  {t('tabLogin')}
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-none border-0 py-2 text-[13px] transition ${
                    mode === 'register'
                      ? 'bg-[var(--surface2)] text-[var(--text)]'
                      : 'text-[var(--text2)]'
                  }`}
                  onClick={() => {
                    setMode('register');
                    setMagicSent(false);
                    setFormError(null);
                  }}
                >
                  {t('tabRegister')}
                </button>
              </div>

              <div className="mb-6 flex flex-col rounded-none border border-[var(--border2)]">
                <button
                  type="button"
                  disabled={busy || !authProviders.github}
                  onClick={() => onOAuth('github')}
                  className="flex w-full items-center justify-center rounded-none border-0 border-b border-[var(--border2)] bg-[var(--surface)] px-4 py-2.5 text-[13px] text-[var(--text)] transition hover:bg-[var(--surface2)] disabled:cursor-not-allowed disabled:opacity-40"
                  title={!authProviders.github ? t('oauthDisabledHint') : undefined}
                >
                  <FaGithub className="mr-2.5 h-[18px] w-[18px] shrink-0 text-[var(--text)]" />
                  {t('oauthGithub')}
                </button>
                <button
                  type="button"
                  disabled={busy || !authProviders.google}
                  onClick={() => onOAuth('google')}
                  className="flex w-full items-center justify-center rounded-none border-0 bg-[var(--surface)] px-4 py-2.5 text-[13px] text-[var(--text)] transition hover:bg-[var(--surface2)] disabled:cursor-not-allowed disabled:opacity-40"
                  title={!authProviders.google ? t('oauthDisabledHint') : undefined}
                >
                  <svg className="mr-2.5 h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" aria-hidden>
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  {t('oauthGoogle')}
                </button>
              </div>

              <div className="mb-6 flex items-center">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="whitespace-nowrap px-2 text-[11px] uppercase tracking-wide text-[var(--text3)]">
                  {t('dividerEmail')}
                </span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>

              {magicSent ? (
                <div className="animate-[fadeUp_0.4s_ease_both] py-5 text-center">
                  <div className="mx-auto mb-4 flex h-[52px] w-[52px] items-center justify-center rounded-none border border-[color-mix(in_oklab,var(--amber)_25%,transparent)] bg-[color-mix(in_oklab,var(--amber)_12%,transparent)] text-[22px]">
                    ✉️
                  </div>
                  <h3 className="mb-2 font-serif text-xl text-[var(--text)]">{t('magicTitle')}</h3>
                  <p className="text-[13px] font-light leading-relaxed text-[var(--text2)]">{t('magicBody')}</p>
                  <div className="mt-4 text-xs text-[var(--text3)]">
                    <button
                      type="button"
                      className="text-[var(--amber)] hover:underline disabled:opacity-60"
                      disabled={resendLabel === 'sent'}
                      onClick={() => {
                        setResendLabel('sent');
                        setTimeout(() => setResendLabel('idle'), 4000);
                      }}
                    >
                      {resendLabel === 'sent' ? t('magicResent') : t('magicResend')}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {combinedError ? (
                    <p className="mb-3 rounded-none border border-[color-mix(in_oklab,var(--amber)_35%,transparent)] bg-[color-mix(in_oklab,var(--amber)_10%,transparent)] px-3 py-2 text-center text-xs text-[var(--text)]">
                      {combinedError}
                    </p>
                  ) : null}

                  {mode === 'register' ? (
                    <div className="mb-3.5">
                      <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-[var(--text2)]">
                        {t('labelUsername')}
                      </label>
                      <input
                        className="w-full rounded-none border border-[var(--border2)] bg-[var(--surface)] px-3.5 py-2.5 text-[13px] text-[var(--text)] outline-none transition focus:border-[var(--amber)]"
                        placeholder={t('usernamePlaceholder')}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        autoComplete="name"
                      />
                    </div>
                  ) : null}

                  <div className="mb-3.5">
                    <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-[var(--text2)]">
                      {t('labelEmail')}
                    </label>
                    <input
                      className="w-full rounded-none border border-[var(--border2)] bg-[var(--surface)] px-3.5 py-2.5 text-[13px] text-[var(--text)] outline-none transition placeholder:text-[var(--text3)] focus:border-[var(--amber)]"
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>

                  <div className="mb-3.5">
                    <label className="mb-1.5 block text-[11px] uppercase tracking-wide text-[var(--text2)]">
                      {t('labelPassword')}
                    </label>
                    <div className="relative">
                      <input
                        className="w-full rounded-none border border-[var(--border2)] bg-[var(--surface)] py-2.5 pl-3.5 pr-10 text-[13px] text-[var(--text)] outline-none transition placeholder:text-[var(--text3)] focus:border-[var(--amber)]"
                        type={pwVisible ? 'text' : 'password'}
                        placeholder={t('passwordPlaceholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      />
                      <button
                        type="button"
                        tabIndex={-1}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text2)]"
                        onClick={() => setPwVisible((v) => !v)}
                        aria-label={pwVisible ? 'Hide password' : 'Show password'}
                      >
                        {pwVisible ? '⌣' : '◉'}
                      </button>
                    </div>
                  </div>

                  {mode === 'login' ? (
                    <div className="mb-5 flex items-center justify-between">
                      <label className="flex cursor-pointer items-center text-xs text-[var(--text2)]">
                        <input type="checkbox" defaultChecked className="mr-2 accent-[var(--amber)]" />
                        {t('remember')}
                      </label>
                      <button type="button" className="text-xs text-[var(--amber)] hover:underline" onClick={showForgot}>
                        {t('forgot')}
                      </button>
                    </div>
                  ) : (
                    <div className="mb-5" />
                  )}

                  <button
                    type="button"
                    disabled={busy}
                    onClick={onSubmit}
                    className="w-full rounded-none bg-[var(--amber)] py-3 text-sm font-medium text-[#0e0d0b] transition hover:bg-[var(--amber2)] active:scale-[0.99] disabled:opacity-70"
                  >
                    {busy ? t('submitBusy') : mode === 'login' ? t('submitLogin') : t('submitRegister')}
                  </button>

                  <p className="mt-5 text-center text-xs text-[var(--text2)]">
                    {mode === 'login' ? (
                      <>
                        {t('switchToRegister')}{' '}
                        <button
                          type="button"
                          className="text-[var(--amber)] hover:underline"
                          onClick={() => setMode('register')}
                        >
                          {t('switchToRegisterLink')}
                        </button>
                      </>
                    ) : (
                      <>
                        {t('switchToLogin')}{' '}
                        <button
                          type="button"
                          className="text-[var(--amber)] hover:underline"
                          onClick={() => setMode('login')}
                        >
                          {t('switchToLoginLink')}
                        </button>
                      </>
                    )}
                  </p>
                </div>
              )}

              <p className="mt-6 text-center text-[11px] leading-relaxed text-[var(--text3)]">
                {t('disclaimer')}
              </p>
            </div>
          </div>
        </div>
        </div>
      </main>
      <OpenPromptsSiteFooter locale={locale} spacing="flush" />
    </div>
  );
}
