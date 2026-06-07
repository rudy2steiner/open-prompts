'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import { FaGithub } from 'react-icons/fa';
import { languages, locales } from '~/config';
import { UserAvatar } from '~/components/open-prompts/UserAvatar';
import { applyOpThemeToDocument, getOpDocumentTheme } from '~/lib/op-theme';
import {
  buildLocaleHref,
  parseOpLocale,
  persistOpLocale,
  type OpLocale,
} from '~/lib/op-locale';
import {
  accountPanelHref,
  type AccountPanel,
} from '~/lib/account/account-path';

export type OpenPromptsSiteNavKey = 'gallery' | 'create' | 'submit' | 'rank' | 'docs' | 'login' | 'account';

export type OpenPromptsSiteHeaderProps = {
  locale: string;
  activeNav: OpenPromptsSiteNavKey;
  /** Appended to `/${locale}` for language links (e.g. `/create` on the create page). */
  langPathSuffix?: string;
  /** Tailwind z-index class for sticky stacking (create uses z-50). */
  stickyZClass?: string;
  githubAriaLabel?: string;
  githubTitle?: string;
  /** Extra text after submit CTA label (create uses ` →`). */
  submitCtaSuffix?: string;
};

function accountHref(locale: string, panel?: AccountPanel): string {
  return accountPanelHref(locale, panel ?? 'overview');
}

export function OpenPromptsSiteHeader({
  locale,
  activeNav,
  langPathSuffix = '',
  stickyZClass = 'z-30',
  githubAriaLabel,
  githubTitle,
  submitCtaSuffix = '',
}: OpenPromptsSiteHeaderProps) {
  const t = useTranslations('OpenPrompts');
  const ta = useTranslations('OpenPrompts.accountPage');
  const { data: session, status } = useSession();
  const [langOpen, setLangOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const langWrapRef = useRef<HTMLDivElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  const ghAria = githubAriaLabel ?? 'GitHub repository';
  const ghTitle = githubTitle ?? 'GitHub';

  const displayName = useMemo(() => {
    const u = session?.user;
    if (!u) return '';
    const n = u.name?.trim();
    if (n) return n;
    return t('header.displayNameFallback');
  }, [session?.user, t]);

  const isAdmin = Boolean(session?.user?.isAdmin);

  const dashboardMenuItems = useMemo(() => {
    const items: { panel: AccountPanel; label: string; href: string }[] = [
      { panel: 'overview', label: ta('nav.overview'), href: accountHref(locale, 'overview') },
      { panel: 'prompts', label: ta('nav.prompts'), href: accountHref(locale, 'prompts') },
    ];
    if (isAdmin) {
      items.push({
        panel: 'admin',
        label: ta('nav.adminReview'),
        href: accountHref(locale, 'admin'),
      });
    }
    items.push(
      { panel: 'credits', label: ta('nav.credits'), href: accountHref(locale, 'credits') },
      { panel: 'subscription', label: ta('nav.subscription'), href: accountHref(locale, 'subscription') },
    );
    return items;
  }, [locale, isAdmin, ta]);

  const navItems = useMemo(
    () =>
      [
        { key: 'gallery' as const, label: t('nav.gallery'), href: locale === 'en' ? '/' : `/${locale}` },
        { key: 'create' as const, label: t('nav.create'), href: locale === 'en' ? '/create' : `/${locale}/create` },
        { key: 'submit' as const, label: t('nav.submit'), href: locale === 'en' ? '/submit' : `/${locale}/submit` },
        { key: 'rank' as const, label: t('nav.rank'), href: '#' },
        { key: 'docs' as const, label: t('nav.docs'), href: '#' },
      ] as const,
    [t, locale]
  );

  useEffect(() => {
    const parsed = parseOpLocale(locale);
    if (parsed) persistOpLocale(parsed);
  }, [locale]);

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

  return (
    <header className={`sticky top-0 ${stickyZClass} border-b border-[var(--border)] bg-[var(--bg)]`}>
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-6">
        <a href={locale === 'en' ? '/' : `/${locale}`} className="flex items-center gap-2 text-sm font-semibold tracking-wide">
          <span className="relative grid h-8 w-8 place-items-center overflow-hidden rounded-lg">
            <Image src="/logo.png" alt="Open Prompts" fill sizes="32px" className="object-contain" priority />
          </span>
          <span>
            Open <span className="italic text-[var(--amber2)]">Prompts</span>
          </span>
        </a>
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <a
              key={item.key}
              href={item.href}
              className={`rounded-lg px-3 py-1.5 text-xs transition ${
                item.key === activeNav
                  ? 'bg-[color-mix(in_oklab,var(--amber)_12%,transparent)] text-[var(--amber2)]'
                  : 'text-[var(--text2)] hover:bg-[var(--surface2)] hover:text-[var(--text)]'
              }`}
            >
              {item.key === 'create' ? `✦ ${item.label}` : item.key === 'submit' ? `↗ ${item.label}` : item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href="https://github.com/rudy2steiner/open-prompts"
            target="_blank"
            rel="noreferrer"
            className="grid h-9 w-9 place-items-center rounded-xl border border-[var(--ctl-border)] bg-[var(--ctl-bg)] text-[var(--text2)] shadow-sm hover:bg-[var(--ctl-hover)] hover:text-[var(--text)]"
            aria-label={ghAria}
            title={ghTitle}
          >
            <FaGithub className="h-4 w-4" aria-hidden="true" />
          </a>
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
              <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-xl border border-[var(--ctl-border)] bg-[var(--panel-bg)] p-1 shadow-xl">
                {locales.map((l) => {
                  const meta = languages.find((x) => x.lang === l) ?? { lang: l, language: l.toUpperCase() };
                  const label =
                    l === 'en' ? 'English' : l === 'zh' ? '中文' : l === 'ja' ? '日本語' : meta.language;
                  const href = buildLocaleHref(l, langPathSuffix);
                  return (
                    <a
                      key={l}
                      href={href}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition ${
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

          {status === 'authenticated' && session?.user ? (
            <div className="relative flex items-center gap-2" ref={userMenuRef}>
              <button
                type="button"
                className="rounded-full ring-offset-2 ring-offset-[var(--bg)] transition hover:ring-2 hover:ring-[var(--amber)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--amber)]"
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label={t('header.userMenu')}
                onClick={() => {
                  setUserMenuOpen((v) => !v);
                  setLangOpen(false);
                }}
              >
                <UserAvatar
                  image={session.user.image}
                  seed={session.user.email ?? session.user.id}
                  size={32}
                  className="h-8 w-8 shrink-0 rounded-full border border-[var(--border2)] bg-[var(--surface2)] object-cover"
                />
              </button>
              {userMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-xl border border-[var(--ctl-border)] bg-[var(--panel-bg)] py-1 shadow-xl"
                >
                  <div className="border-b border-[var(--border)] px-3 py-2.5">
                    <div className="truncate text-sm font-medium text-[var(--text)]">{displayName}</div>
                    {session.user.email ? (
                      <div className="truncate text-[11px] text-[var(--text3)]">{session.user.email}</div>
                    ) : null}
                  </div>
                  <div className="px-1 py-1">
                    <div className="px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-[var(--text3)]">
                      {t('header.userMenuSection')}
                    </div>
                    {dashboardMenuItems.map((item) => (
                      <Link
                        key={item.panel}
                        role="menuitem"
                        href={item.href}
                        className="block rounded-lg px-3 py-2 text-sm text-[var(--text)] transition hover:bg-[var(--surface2)]"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-[var(--border)] p-1">
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full rounded-lg px-3 py-2 text-left text-sm text-[var(--coral)] transition hover:bg-[var(--surface2)]"
                      onClick={() => {
                        setUserMenuOpen(false);
                        void signOut({ callbackUrl: signOutCallback });
                      }}
                    >
                      {t('header.signOut')}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Link
              href={locale === 'en' ? '/login' : `/${locale}/login`}
              className="shrink-0 rounded-lg border border-[var(--border2)] px-3 py-1.5 text-xs text-[var(--text2)] hover:bg-[var(--surface2)] hover:text-[var(--text)]"
            >
              {t('header.signIn')}
            </Link>
          )}

          <Link
            href={locale === 'en' ? '/submit' : `/${locale}/submit`}
            className="rounded-lg border border-[var(--border2)] px-3 py-1.5 text-xs text-[var(--text2)] hover:bg-[var(--surface2)] hover:text-[var(--text)]"
          >
            {t('nav.submitCta')}
            {submitCtaSuffix}
          </Link>
        </div>
      </div>
    </header>
  );
}
