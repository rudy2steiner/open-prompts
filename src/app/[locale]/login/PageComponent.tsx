'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useState } from 'react';
import { FaGithub } from 'react-icons/fa';
import { CoverImage } from '~/components/prompt-gallery/CoverImage';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';

import { galleryHref } from '~/lib/prompts/gallery-path';

function galleryHomeHref(locale: string) {
  return galleryHref(locale);
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
  promptCountLabel: string;
  modelCountLabel: string;
};

function imageFrameStyle(meta?: { width: number; height: number }) {
  if (!meta || meta.width <= 0 || meta.height <= 0) return { aspectRatio: '4 / 3' };
  return { aspectRatio: `${meta.width} / ${meta.height}` };
}

export default function PageComponent({
  locale,
  authProviders,
  previewPrompts,
  promptCountLabel,
  modelCountLabel,
}: LoginPageProps) {
  const t = useTranslations('OpenPrompts.login');
  const searchParams = useSearchParams();
  const errorCode = searchParams?.get('error') ?? null;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pwVisible, setPwVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<Record<string, { width: number; height: number }>>({});

  const callbackUrl = useMemo(() => {
    const raw = searchParams?.get('callbackUrl');
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return galleryHomeHref(locale);
  }, [locale, searchParams]);
  const stackPrompts = useMemo(() => stackThree(previewPrompts), [previewPrompts]);

  const mapAuthError = useCallback(() => {
    if (errorCode === 'CredentialsSignin') return t('errorCredentials');
    if (errorCode === 'Configuration') return t('errorConfiguration');
    if (errorCode === 'AccessDenied') return t('errorAccessDenied');
    if (errorCode === 'OAuthAccountNotLinked') return t('errorOAuthAccountNotLinked');
    if (errorCode === 'OAuthEmailRequired') return t('errorOAuth');
    if (errorCode === 'Callback') return t('errorOAuthPersist');
    if (errorCode === 'OAuthSignin' || errorCode === 'OAuthCallback') return t('errorOAuth');
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
      const signInRes = await signIn('credentials', {
        email: email.trim().toLowerCase(),
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

  const combinedError = formError || urlError;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[var(--bg)]">
      <OpenPromptsSiteHeader locale={locale} activeNav="login" langPathSuffix="/login" />

      <main className="relative isolate flex min-h-0 flex-1 flex-col">
        <div
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.028]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          }}
        />
        <div className="pointer-events-none fixed -top-[280px] left-1/2 -z-10 h-[500px] w-[1000px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(232,160,32,0.09)_0%,transparent_68%)]" />
        <div className="pointer-events-none fixed left-[-200px] top-[30%] -z-10 h-[500px] w-[500px] bg-[radial-gradient(ellipse_at_center,rgba(45,180,160,0.05)_0%,transparent_70%)]" />
        <div className="pointer-events-none fixed right-[-200px] top-[40%] -z-10 h-[500px] w-[500px] bg-[radial-gradient(ellipse_at_center,rgba(232,160,32,0.04)_0%,transparent_70%)]" />

        <div className="grid h-full min-h-0 w-full min-w-0 md:grid-cols-2">
            {/* Left — three stacked cards (real prompt covers from gallery) */}
            <div className="relative hidden h-full min-h-0 min-w-0 flex-col justify-between overflow-hidden bg-[radial-gradient(circle_at_18%_18%,rgba(255,214,128,0.46),transparent_34%),radial-gradient(circle_at_82%_28%,rgba(120,232,214,0.34),transparent_34%),radial-gradient(circle_at_62%_78%,rgba(255,255,255,0.18),transparent_36%),linear-gradient(135deg,#f4e8d2_0%,#dcebe3_47%,#f0d7b8_100%)] p-6 md:flex md:border-r md:border-[var(--border)]">
              <div
                className="pointer-events-none absolute inset-0 opacity-100"
                style={{
                  backgroundImage: `linear-gradient(rgba(24,30,28,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(24,30,28,0.045) 1px, transparent 1px)`,
                  backgroundSize: '48px 48px',
                  maskImage: 'radial-gradient(ellipse at 30% 50%, black 30%, transparent 75%)',
                }}
              />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/45 to-transparent" />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#694315]/20 to-transparent" />
              <div className="pointer-events-none absolute bottom-28 left-12 h-20 w-40 border border-[#8a5a1e]/15 bg-white/15 backdrop-blur-sm" />

              <div className="relative z-[1] flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 py-8 lg:px-6">
                <div className="group/cardstack relative mx-auto h-[320px] w-full max-w-[560px]">
                  {stackPrompts.length > 0 ? (
                    <>
                      <Link
                        href={galleryHomeHref(locale)}
                        title={stackPrompts[0].title}
                        className="absolute left-1/2 top-1/2 z-[1] w-[210px] -translate-x-[calc(50%+126px)] -translate-y-1/2 rotate-[-7deg] rounded-none border border-white/70 bg-white/75 opacity-85 shadow-[0_28px_70px_rgba(67,50,28,0.26)] backdrop-blur-md transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-95 group-hover/cardstack:-translate-x-[calc(50%+142px)] group-hover/cardstack:rotate-[-9deg] lg:w-[250px] lg:-translate-x-[calc(50%+168px)] lg:group-hover/cardstack:-translate-x-[calc(50%+184px)]"
                      >
                        <div
                          className="relative w-full overflow-hidden bg-[linear-gradient(135deg,#fff7e8_0%,#d8eee8_62%,#f5dcc0_100%)]"
                          style={imageFrameStyle(imageMeta[stackPrompts[0].id])}
                        >
                          <CoverImage
                            src={stackPrompts[0].coverSrc}
                            alt={stackPrompts[0].title}
                            sizes="(min-width: 1024px) 250px, 210px"
                            className="object-contain drop-shadow-[0_10px_24px_rgba(75,53,26,0.24)]"
                            onMeta={(meta) => setImageMeta((prev) => ({ ...prev, [stackPrompts[0].id]: meta }))}
                            priority
                          />
                        </div>
                        <div className="border-t border-[#42321f]/10 px-2.5 py-2">
                          <div className="truncate text-xs font-medium leading-snug text-[#2b2117]">{stackPrompts[0].title}</div>
                        </div>
                      </Link>
                      <Link
                        href={galleryHomeHref(locale)}
                        title={stackPrompts[1].title}
                        className="absolute left-1/2 top-1/2 z-[3] w-[230px] -translate-x-1/2 -translate-y-1/2 rotate-[2deg] rounded-none border border-white/80 bg-white/85 shadow-[0_34px_80px_rgba(67,50,28,0.3)] backdrop-blur-md transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/cardstack:scale-[1.025] lg:w-[280px]"
                      >
                        <div
                          className="relative w-full overflow-hidden bg-[linear-gradient(135deg,#fffaf0_0%,#d3efe8_55%,#f7ddbb_100%)]"
                          style={imageFrameStyle(imageMeta[stackPrompts[1].id])}
                        >
                          <CoverImage
                            src={stackPrompts[1].coverSrc}
                            alt={stackPrompts[1].title}
                            sizes="(min-width: 1024px) 280px, 230px"
                            className="object-contain drop-shadow-[0_12px_28px_rgba(75,53,26,0.28)]"
                            onMeta={(meta) => setImageMeta((prev) => ({ ...prev, [stackPrompts[1].id]: meta }))}
                          />
                        </div>
                        <div className="border-t border-[#42321f]/10 px-2.5 py-2">
                          <div className="truncate text-xs font-medium leading-snug text-[#2b2117]">{stackPrompts[1].title}</div>
                        </div>
                      </Link>
                      <Link
                        href={galleryHomeHref(locale)}
                        title={stackPrompts[2].title}
                        className="absolute left-1/2 top-1/2 z-[2] w-[210px] -translate-x-[calc(50%-126px)] -translate-y-1/2 rotate-[8deg] rounded-none border border-white/70 bg-white/75 opacity-85 shadow-[0_28px_70px_rgba(67,50,28,0.26)] backdrop-blur-md transition duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:opacity-95 group-hover/cardstack:-translate-x-[calc(50%-142px)] group-hover/cardstack:rotate-[10deg] lg:w-[250px] lg:-translate-x-[calc(50%-168px)] lg:group-hover/cardstack:-translate-x-[calc(50%-184px)]"
                      >
                        <div
                          className="relative w-full overflow-hidden bg-[linear-gradient(135deg,#fff7e8_0%,#d8eee8_62%,#f5dcc0_100%)]"
                          style={imageFrameStyle(imageMeta[stackPrompts[2].id])}
                        >
                          <CoverImage
                            src={stackPrompts[2].coverSrc}
                            alt={stackPrompts[2].title}
                            sizes="(min-width: 1024px) 250px, 210px"
                            className="object-contain drop-shadow-[0_10px_24px_rgba(75,53,26,0.24)]"
                            onMeta={(meta) => setImageMeta((prev) => ({ ...prev, [stackPrompts[2].id]: meta }))}
                          />
                        </div>
                        <div className="border-t border-[#42321f]/10 px-2.5 py-2">
                          <div className="truncate text-xs font-medium leading-snug text-[#2b2117]">{stackPrompts[2].title}</div>
                        </div>
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="absolute left-1/2 top-1/2 z-[1] w-[210px] -translate-x-[calc(50%+126px)] -translate-y-1/2 rotate-[-7deg] rounded-none border border-white/70 bg-white/70 opacity-70 shadow-[0_28px_70px_rgba(67,50,28,0.22)] backdrop-blur-md lg:w-[250px] lg:-translate-x-[calc(50%+168px)]">
                        <div className="grid h-[170px] place-items-center bg-[linear-gradient(135deg,#fff7e8_0%,#d8eee8_62%,#f5dcc0_100%)] text-[10px] text-[#6a5438] lg:h-[200px]">—</div>
                        <div className="border-t border-[#42321f]/10 px-2.5 py-2 text-xs text-[#6a5438]">—</div>
                      </div>
                      <div className="absolute left-1/2 top-1/2 z-[3] w-[230px] -translate-x-1/2 -translate-y-1/2 rotate-[2deg] rounded-none border border-white/80 bg-white/80 opacity-75 shadow-[0_34px_80px_rgba(67,50,28,0.26)] backdrop-blur-md lg:w-[280px]">
                        <div className="grid h-[186px] place-items-center bg-[linear-gradient(135deg,#fffaf0_0%,#d3efe8_55%,#f7ddbb_100%)] text-[10px] text-[#6a5438] lg:h-[224px]">—</div>
                        <div className="border-t border-[#42321f]/10 px-2.5 py-2 text-xs text-[#6a5438]">—</div>
                      </div>
                      <div className="absolute left-1/2 top-1/2 z-[2] w-[210px] -translate-x-[calc(50%-126px)] -translate-y-1/2 rotate-[8deg] rounded-none border border-white/70 bg-white/70 opacity-70 shadow-[0_28px_70px_rgba(67,50,28,0.22)] backdrop-blur-md lg:w-[250px] lg:-translate-x-[calc(50%-168px)]">
                        <div className="grid h-[170px] place-items-center bg-[linear-gradient(135deg,#fff7e8_0%,#d8eee8_62%,#f5dcc0_100%)] text-[10px] text-[#6a5438] lg:h-[200px]">—</div>
                        <div className="border-t border-[#42321f]/10 px-2.5 py-2 text-xs text-[#6a5438]">—</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="relative z-[1]">
                <h2 className="font-serif text-2xl leading-tight tracking-tight text-[var(--text)] md:text-[28px]">
                  {t('promoTitleLine1')}
                  <br />
                  <span className="italic text-[var(--amber2)]">{t('promoTitleLine2')}</span> {t('promoTitleLine2Suffix')}
                </h2>
                <p className="mt-2.5 max-w-[340px] text-[13px] font-light leading-relaxed text-[var(--text2)]">
                  {t('promoDesc')}
                </p>
                <div className="mt-4 flex">
                  <div className="pr-6">
                    <div className="font-serif text-lg text-[var(--amber2)]">{promptCountLabel}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--text3)]">
                      {t('promoStatPrompts')}
                    </div>
                  </div>
                  <div className="border-l border-[var(--border)] px-6">
                    <div className="font-serif text-lg text-[var(--amber2)]">{modelCountLabel}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--text3)]">
                      {t('promoStatModels')}
                    </div>
                  </div>
                  <div className="border-l border-[var(--border)] pl-6">
                    <div className="font-serif text-lg text-[var(--amber2)]">{t('promoLicenseName')}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[var(--text3)]">
                      {t('promoStatLicense')}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right — auth */}
            <div className="relative flex h-full min-h-0 min-w-0 flex-col items-center justify-center overflow-y-auto p-6">
              <div className="absolute left-6 top-6 z-10">
                <Link
                  href={galleryHomeHref(locale)}
                  className="inline-flex items-center rounded-none border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text2)] transition hover:border-[var(--border2)] hover:text-[var(--text)]"
                >
                  <span className="mr-1.5" aria-hidden>
                    ‹
                  </span>
                  {t('backGallery')}
                </Link>
              </div>

              <div className="w-full max-w-[380px] animate-[fadeUp_0.5s_ease_both] py-4">
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

              {!authProviders.github && !authProviders.google ? (
                <p className="mb-4 rounded-lg border border-[var(--border2)] bg-[var(--surface2)] px-3 py-2 text-xs text-[var(--text2)]">
                  {t('oauthSetupHint')}
                </p>
              ) : null}

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

              <div>
                  {combinedError ? (
                    <div className="mb-3 rounded-none border border-[color-mix(in_oklab,var(--amber)_35%,transparent)] bg-[color-mix(in_oklab,var(--amber)_10%,transparent)] px-3 py-2 text-center text-xs text-[var(--text)]">
                      <p>{combinedError}</p>
                      {errorCode === 'CredentialsSignin' || formError ? (
                        <p className="mt-2 text-left text-[11px] leading-relaxed text-[var(--text2)]">
                          {t('errorCredentialsHint')}
                        </p>
                      ) : null}
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
                        autoComplete="current-password"
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

                  <div className="mb-5">
                    <label className="flex cursor-pointer items-center text-xs text-[var(--text2)]">
                      <input type="checkbox" defaultChecked className="mr-2 accent-[var(--amber)]" />
                      {t('remember')}
                    </label>
                  </div>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={onSubmit}
                    className="w-full rounded-none bg-[var(--amber)] py-3 text-sm font-medium text-[#0e0d0b] transition hover:bg-[var(--amber2)] active:scale-[0.99] disabled:opacity-70"
                  >
                    {busy ? t('submitBusy') : t('submitLogin')}
                  </button>
              </div>

              <p className="mt-6 text-center text-[11px] leading-relaxed text-[var(--text3)]">
                {t('disclaimer')}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
