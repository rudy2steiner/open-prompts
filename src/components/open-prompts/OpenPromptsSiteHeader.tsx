'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import Image from 'next/image';
import Link, { useLinkStatus } from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { languages, locales } from '~/config';
import { CreditBadge } from '~/components/open-prompts/CreditBadge';
import { PromptDownloadDialog } from '~/components/open-prompts/PromptDownloadDialog';
import { SignInDialog } from '~/components/open-prompts/SignInDialog';
import { UserAvatar } from '~/components/open-prompts/UserAvatar';
import { applyOpThemeToDocument, getOpDocumentTheme } from '~/lib/op-theme';
import {
  buildLocaleHref,
  parseOpLocale,
  persistOpLocale,
  type OpLocale,
} from '~/lib/op-locale';
import { CREDITS_CHANGED_EVENT } from '~/lib/billing/credits-changed';
import { galleryHref } from '~/lib/prompts/gallery-path';
import { categoriesHref } from '~/lib/prompts/seo-paths';
import {
  clearAccountSnapshot,
  readAccountSnapshot,
  writeAccountSnapshot,
  type AccountDisplaySnapshot,
} from '~/lib/auth/account-snapshot';

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

type HeaderUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
};

export function resolveHeaderAccountView(
  status: 'loading' | 'authenticated' | 'unauthenticated',
  liveUser: HeaderUser | null,
  cached: AccountDisplaySnapshot | null,
) {
  const verifiedUser = status === 'authenticated' ? liveUser : null;
  const cachedUser = status === 'loading' && cached ? {
    id: cached.userId,
    name: cached.name,
    email: cached.email,
    image: cached.image,
    isAdmin: false,
  } : null;
  const user = verifiedUser ?? cachedUser;
  return {
    user,
    canShowAdmin: Boolean(verifiedUser?.isAdmin),
    showSignIn: status === 'unauthenticated',
    showPlaceholder: status === 'loading' && !user,
  };
}

function SiteNavPendingIndicator() {
  const { pending } = useLinkStatus();
  return (
    <span
      aria-hidden="true"
      data-nav-pending={pending ? 'true' : 'false'}
      className={`ml-1 inline-block h-1.5 w-1.5 rounded-full bg-current align-middle transition-opacity ${
        pending ? 'animate-pulse opacity-60' : 'opacity-0'
      }`}
    />
  );
}

function SiteNavLink({ children, ...props }: ComponentProps<typeof Link>) {
  return (
    <Link {...props} data-op-site-nav="true" prefetch={false}>
      {children}
      <SiteNavPendingIndicator />
    </Link>
  );
}

export type OpenPromptsSiteNavKey =
  | 'home'
  | 'gallery'
  | 'motion'
  | 'categories'
  | 'create'
  | 'pricing'
  | 'submit'
  | 'login'
  | 'account';

export type OpenPromptsSiteHeaderProps = {
  locale: string;
  activeNav: OpenPromptsSiteNavKey;
  /** Appended to `/${locale}` for language links (e.g. `/create` on the create page). */
  langPathSuffix?: string;
  /** Tailwind z-index class for sticky stacking (create uses z-50). */
  stickyZClass?: string;
};

export function OpenPromptsSiteHeader({
  locale,
  activeNav,
  langPathSuffix = '',
  stickyZClass = 'z-30',
}: OpenPromptsSiteHeaderProps) {
  const t = useTranslations('OpenPrompts');
  const { data: session, status } = useSession();
  const [cachedAccount, setCachedAccount] = useState<AccountDisplaySnapshot | null>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const langWrapRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    document.documentElement.dataset.opSiteNavReady = 'true';
    const navWindow = window as Window & { __opPendingSiteNav?: string };
    const pendingHref = navWindow.__opPendingSiteNav;
    if (!pendingHref) return;
    delete navWindow.__opPendingSiteNav;
    const pendingUrl = new URL(pendingHref, window.location.href);
    const pendingLink = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[data-op-site-nav="true"]'))
      .find((link) => link.href === pendingUrl.href);
    pendingLink?.removeAttribute('aria-busy');
    window.requestAnimationFrame(() => pendingLink?.click());
  }, []);

  const accountView = resolveHeaderAccountView(status, session?.user ?? null, cachedAccount);
  const accountUser = accountView.user;

  const displayName = useMemo(() => {
    const u = accountUser;
    if (!u) return '';
    const n = u.name?.trim();
    if (n) return n;
    return t('header.displayNameFallback');
  }, [accountUser, t]);

  const isAdmin = accountView.canShowAdmin;

  const dashboardMenuItems = useMemo(() => {
    const items: { key: string; label: string; href: string }[] = [];
    if (isAdmin) {
      items.push({ key: 'admin', label: t('header.admin'), href: locale === 'en' ? '/admin' : `/${locale}/admin` });
    }
    items.push({ key: 'billing', label: t('header.billing'), href: locale === 'en' ? '/billing' : `/${locale}/billing` });
    return items;
  }, [locale, isAdmin, t]);

  const navItems = useMemo(
    () =>
      [
        { key: 'home' as const, label: t('nav.home'), href: buildLocaleHref(locale) },
        { key: 'gallery' as const, label: t('nav.gallery'), href: galleryHref(locale) },
        { key: 'motion' as const, label: t('nav.motion'), href: buildLocaleHref(locale, '/motion-prompts') },
        { key: 'categories' as const, label: t('nav.categories'), href: categoriesHref(locale) },
        { key: 'create' as const, label: t('nav.create'), href: locale === 'en' ? '/create' : `/${locale}/create` },
        { key: 'pricing' as const, label: t('nav.pricing'), href: locale === 'en' ? '/pricing' : `/${locale}/pricing` },
        { key: 'submit' as const, label: t('nav.submit'), href: locale === 'en' ? '/submit' : `/${locale}/submit` },
      ] as const,
    [t, locale]
  );

  useEffect(() => {
    const parsed = parseOpLocale(locale);
    if (parsed) persistOpLocale(parsed);
  }, [locale]);

  useBrowserLayoutEffect(() => {
    const snapshot = readAccountSnapshot(window.sessionStorage);
    setCachedAccount(snapshot);
    if (snapshot?.balance != null) setBalance(snapshot.balance);
  }, []);

  useEffect(() => {
    if (status === 'unauthenticated') {
      clearAccountSnapshot(window.sessionStorage);
      setCachedAccount(null);
      setBalance(null);
      return;
    }
    if (status !== 'authenticated' || !session?.user?.id) return;
    const snapshot: AccountDisplaySnapshot = {
      version: 1,
      userId: session.user.id,
      name: session.user.name ?? null,
      email: session.user.email ?? null,
      image: session.user.image ?? null,
      isAdmin: Boolean(session.user.isAdmin),
      balance,
      updatedAt: Date.now(),
    };
    writeAccountSnapshot(window.sessionStorage, snapshot);
    setCachedAccount(snapshot);
  }, [balance, session?.user?.email, session?.user?.id, session?.user?.image, session?.user?.isAdmin, session?.user?.name, status]);

  useEffect(() => {
    let live = true;
    const refresh = () => {
      void fetch('/api/billing/balance', { cache: 'no-store' })
        .then((response) => response.json())
        .then((data: { balance?: unknown }) => {
          if (!live) return;
          const value = Number(data?.balance);
          setBalance(Number.isFinite(value) ? value : 0);
        })
        .catch(() => {
          if (live) setBalance(null);
        });
    };
    refresh();
    window.addEventListener(CREDITS_CHANGED_EVENT, refresh);
    window.addEventListener('focus', refresh);
    return () => {
      live = false;
      window.removeEventListener(CREDITS_CHANGED_EVENT, refresh);
      window.removeEventListener('focus', refresh);
    };
  }, [status]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (langWrapRef.current && !langWrapRef.current.contains(target)) setLangOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setUserMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const signOutCallback = locale === 'en' ? '/' : `/${locale}`;
  const signInHref = locale === 'en' ? '/login' : `/${locale}/login`;
  const creditsLabel = t('header.credits');
  const creditBadge = balance == null ? null : <CreditBadge balance={balance} label={creditsLabel} />;

  return (
    <>
    <header
      className={`sticky ${stickyZClass} border-b border-[var(--border)] bg-[var(--bg)]`}
      style={{ top: 'var(--promo-banner-height, 0px)' }}
    >
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 md:px-6">
        <Link data-op-site-nav="true" prefetch={false} href={locale === 'en' ? '/' : `/${locale}`} className="flex min-w-0 items-center gap-2 whitespace-nowrap text-sm font-semibold tracking-wide">
          <span className="relative grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg">
            <Image src="/logo.png" alt="Open Prompts" fill sizes="32px" className="object-contain" priority />
          </span>
          <span className="hidden min-w-0 truncate min-[360px]:block">
            Open <span className="italic text-[var(--amber2)]">Prompts</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <SiteNavLink
              key={item.key}
              href={item.href}
              aria-current={item.key === activeNav ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                item.key === activeNav
                  ? 'bg-[color-mix(in_oklab,var(--amber)_12%,transparent)] text-[var(--amber2)]'
                  : 'text-[var(--text2)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'
              }`}
            >
              {item.key === 'create' ? `✦ ${item.label}` : item.key === 'submit' ? `↗ ${item.label}` : item.label}
            </SiteNavLink>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="grid h-9 w-9 grid-cols-1 grid-rows-1 place-items-center rounded-xl border border-[var(--ctl-border)] bg-[var(--ctl-bg)] text-[var(--text2)] shadow-sm hover:bg-[var(--ctl-hover)] hover:text-[var(--text)]"
            title={t('header.themeToggle')}
            onClick={() => {
              const cur = getOpDocumentTheme();
              const next = cur === 'dark' ? 'light' : 'dark';
              applyOpThemeToDocument(next);
              try {
                localStorage.setItem('op_theme', next);
              } catch {
                // ignore
              }
            }}
          >
            <span className="op-theme-toggle-moon" aria-hidden="true">
              ☾
            </span>
            <span className="op-theme-toggle-sun" aria-hidden="true">
              ☀︎
            </span>
          </button>

          <div className="relative" ref={langWrapRef}>
            <button
              type="button"
              className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--ctl-border)] bg-[var(--ctl-bg)] text-[var(--text2)] shadow-sm hover:bg-[var(--ctl-hover)] hover:text-[var(--text)]"
              onClick={() => setLangOpen((v) => !v)}
              title={t('header.language')}
            >
              <span className="text-[12px] font-semibold tracking-tight leading-none">文A</span>
            </button>
            {langOpen ? (
              <div className="absolute right-0 z-50 mt-2 w-max overflow-hidden rounded-xl border border-[var(--ctl-border)] bg-[var(--panel-bg)] p-1 shadow-xl">
                {locales.map((l) => {
                  const meta = languages.find((x) => x.lang === l) ?? { lang: l, language: l.toUpperCase() };
                  const label =
                    meta.language;
                  const href = buildLocaleHref(l, langPathSuffix);
                  return (
                    <a
                      key={l}
                      href={href}
                      className={`flex items-center justify-between gap-3 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
                        l === locale ? 'text-[var(--text)]' : 'text-[var(--text)] hover:bg-[var(--surface2)]'
                      }`}
                      onClick={() => persistOpLocale(l as OpLocale)}
                    >
                      <span>{label}</span>
                      {l === locale ? <span className="text-[12px] text-[var(--amber)]">✓</span> : null}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          {accountUser ? (
            <div className="relative flex items-center gap-2" ref={userMenuRef}>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full transition hover:opacity-90 focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--amber)]"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label={t('header.userMenu')}
                onClick={() => {
                  setUserMenuOpen((v) => !v);
                  setLangOpen(false);
                }}
              >
                {creditBadge}
                <UserAvatar
                  image={accountUser.image}
                  seed={accountUser.email ?? accountUser.id}
                  name={accountUser.name}
                  size={32}
                  className="h-8 w-8"
                />
              </button>
              {userMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--ctl-border)] bg-[var(--panel-bg)] py-1 shadow-xl"
                >
                  <div className="border-b border-[var(--border)] px-3 py-2.5">
                    <div className="truncate text-sm font-medium text-[var(--text)]">{displayName}</div>
                    {accountUser.email ? (
                      <div className="truncate text-[11px] text-[var(--text3)]">{accountUser.email}</div>
                    ) : null}
                  </div>
                  <div className="px-1 py-1">
                    {dashboardMenuItems.map((item) => (
                      <Link
                        key={item.key}
                        role="menuitem"
                        href={item.href}
                        className="block rounded-lg px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface2)]"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--text)] transition hover:bg-[var(--surface2)]"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setDownloadOpen(true);
                      }}
                    >
                      {t('gallery.batchDownload')}
                    </button>
                  </div>
                  <div className="border-t border-[var(--border)] p-1">
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--coral)] transition hover:bg-[var(--surface2)]"
                      onClick={() => {
                        setUserMenuOpen(false);
                        clearAccountSnapshot(window.sessionStorage);
                        setCachedAccount(null);
                        void signOut({ callbackUrl: signOutCallback });
                      }}
                    >
                      {t('header.signOut')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : accountView.showPlaceholder ? (
            <div className="flex items-center gap-2" aria-hidden="true">
              {balance != null && balance > 0 ? creditBadge : null}
              <span className="h-8 w-[50px] shrink-0" />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {balance != null && balance > 0 ? creditBadge : null}
              <a
                href={signInHref}
                aria-haspopup="dialog"
                aria-expanded={signInOpen}
                className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-[var(--border2)] px-3 py-1.5 text-xs text-[var(--text2)] hover:bg-[var(--surface2)] hover:text-[var(--text)] md:min-h-0"
                onClick={(event) => {
                  event.preventDefault();
                  setSignInOpen(true);
                  setLangOpen(false);
                }}
              >
                {t('header.signIn')}
              </a>
            </div>
          )}
        </div>
      </div>
      <nav className="flex w-full items-center gap-1 overflow-x-auto border-t border-[var(--border)] px-4 py-2 lg:hidden">
        {navItems.filter(item => item.href !== '#').map(item => (
          <SiteNavLink key={item.key} href={item.href} aria-current={item.key === activeNav ? 'page' : undefined}
            className={`shrink-0 rounded-lg px-3 py-2 text-xs transition ${item.key === activeNav
              ? 'bg-[color-mix(in_oklab,var(--amber)_12%,transparent)] text-[var(--amber2)]'
              : 'text-[var(--text2)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'}`}>
            {item.label}
          </SiteNavLink>
        ))}
      </nav>
    </header>
    <PromptDownloadDialog open={downloadOpen} locale={locale} onClose={() => setDownloadOpen(false)} />
    <SignInDialog open={signInOpen} onClose={() => setSignInOpen(false)} />
    </>
  );
}
