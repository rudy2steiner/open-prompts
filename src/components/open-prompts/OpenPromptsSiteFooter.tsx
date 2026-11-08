'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { FaGithub } from 'react-icons/fa';
import { buildLocaleHref } from '~/lib/op-locale';
import { CREATION_TYPES, creationTypeHref } from '~/lib/generation/creation-types';
import { galleryHref } from '~/lib/prompts/gallery-path';
import { categoriesHref } from '~/lib/prompts/seo-paths';
import { SUPPORT_EMAIL } from '~/lib/support/email';

export type OpenPromptsSiteFooterProps = {
  locale: string;
  /** Default: `footer.tagline` from OpenPrompts namespace. */
  tagline?: ReactNode;
  /** `spaced` = gallery/legal (mt-10 py-8); `flush` = create rail layout (py-6 only). */
  spacing?: 'spaced' | 'flush';
};

const FRIENDS = [
  { label: 'ReclipMuse', href: 'https://www.reclipmuse.com' },
  { label: 'Bubble Letter Alphabet', href: 'https://www.bubbleletteralphabet.com' },
  { label: 'Deep Search Chat', href: 'https://www.deepsearchchat.com' },
  { label: 'YAML Validator', href: 'https://www.yamlvalidator.org' },
  { label: 'Agent Stack Map', href: 'https://www.agentstackmap.com' },
] as const;

function localeHref(locale: string, path: string) {
  return locale === 'en' ? path : `/${locale}${path}`;
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-[var(--text)]">{title}</h2>
      <ul className="mt-2 grid gap-0.5 text-xs text-[var(--text3)] sm:mt-3 sm:gap-2">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children, external = false }: { href: string; children: ReactNode; external?: boolean }) {
  return (
    <li>
      <a
        href={href}
        className="inline-block py-2 hover:text-[var(--text2)] sm:py-0"
        target={external ? '_blank' : undefined}
        rel={external ? 'noreferrer' : undefined}
      >
        {children}
      </a>
    </li>
  );
}

export function OpenPromptsSiteFooter({ locale, tagline, spacing = 'spaced' }: OpenPromptsSiteFooterProps) {
  const t = useTranslations('OpenPrompts');
  const line = tagline ?? t('footer.tagline');
  const year = new Date().getFullYear();
  const footerClass =
    spacing === 'flush'
      ? 'border-t border-[var(--border)] px-6 py-6'
      : 'mt-10 border-t border-[var(--border)] px-6 py-8';

  return (
    <footer className={footerClass}>
      <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-5">
        <div className="col-span-2 lg:col-span-1">
          <p className="text-sm text-[var(--text2)]">{line}</p>
          <a
            href="https://github.com/rudy2steiner/open-prompts"
            className="mt-1 inline-flex items-center gap-1.5 py-2 text-xs text-[var(--text3)] hover:text-[var(--text2)] sm:mt-3 sm:py-0"
            target="_blank"
            rel="noreferrer"
          >
            <FaGithub className="h-4 w-4" aria-hidden="true" />
            <span>{t('footer.links.github')}</span>
          </a>
        </div>
        <FooterColumn title={t('footer.product')}>
          <FooterLink href={galleryHref(locale)}>{t('nav.gallery')}</FooterLink>
          <FooterLink href={buildLocaleHref(locale, '/motion-prompts')}>{t('nav.motion')}</FooterLink>
          <FooterLink href={categoriesHref(locale)}>{t('nav.categories')}</FooterLink>
          <FooterLink href={localeHref(locale, '/create')}>{t('nav.create')}</FooterLink>
          {CREATION_TYPES.map((type) => (
            <FooterLink key={type.slug} href={creationTypeHref(locale, type.slug)}>
              {t(`creationTypes.types.${type.key}.name`)}
            </FooterLink>
          ))}
          <FooterLink href={localeHref(locale, '/pricing')}>{t('nav.pricing')}</FooterLink>
        </FooterColumn>
        <FooterColumn title={t('footer.friends')}>
          {FRIENDS.map((friend) => (
            <FooterLink key={friend.href} href={friend.href} external>{friend.label}</FooterLink>
          ))}
        </FooterColumn>
        <FooterColumn title={t('footer.support')}>
          <FooterLink href={localeHref(locale, '/help')}>{t('footer.help')}</FooterLink>
          <FooterLink href={localeHref(locale, '/contact')}>{t('footer.contact')}</FooterLink>
          <FooterLink href={localeHref(locale, '/community')}>{t('footer.community')}</FooterLink>
          <FooterLink href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</FooterLink>
        </FooterColumn>
        <FooterColumn title={t('footer.legal')}>
          <FooterLink href={localeHref(locale, '/privacy')}>{t('footer.privacy')}</FooterLink>
          <FooterLink href={localeHref(locale, '/terms')}>{t('footer.terms')}</FooterLink>
          <FooterLink href={localeHref(locale, '/cookies')}>{t('footer.cookies')}</FooterLink>
        </FooterColumn>
      </div>
      <div className="mx-auto mt-8 w-full max-w-7xl border-t border-[var(--border)] pt-6 text-xs text-[var(--text3)]">
        © {year} Open Prompts. {t('footer.rights')}
      </div>
    </footer>
  );
}
