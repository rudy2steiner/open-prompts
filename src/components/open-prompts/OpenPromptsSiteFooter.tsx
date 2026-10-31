'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { FaGithub } from 'react-icons/fa';
import { categoriesHref, modelLandingHref } from '~/lib/prompts/seo-paths';

export type OpenPromptsSiteFooterProps = {
  locale: string;
  /** Default: `footer.tagline` from OpenPrompts namespace. */
  tagline?: ReactNode;
  /** `spaced` = gallery/legal (mt-10 py-8); `flush` = create rail layout (py-6 only). */
  spacing?: 'spaced' | 'flush';
};

function privacyHref(locale: string) {
  return locale === 'en' ? '/privacy-policy' : `/${locale}/privacy-policy`;
}

function submitHref(locale: string) {
  return locale === 'en' ? '/submit' : `/${locale}/submit`;
}

export function OpenPromptsSiteFooter({ locale, tagline, spacing = 'spaced' }: OpenPromptsSiteFooterProps) {
  const t = useTranslations('OpenPrompts');
  const line = tagline ?? t('footer.tagline');
  const footerClass =
    spacing === 'flush'
      ? 'border-t border-[var(--border)] px-6 py-6'
      : 'mt-10 border-t border-[var(--border)] px-6 py-8';

  const links = [
    { label: t('footer.links.github'), href: 'https://github.com/rudy2steiner/open-prompts', external: true },
    {
      label: t('footer.links.gptGallery'),
      href: modelLandingHref(locale, 'gpt-image-2'),
      external: false,
    },
    {
      label: t('footer.links.dalleGallery'),
      href: modelLandingHref(locale, 'dalle-3'),
      external: false,
    },
    {
      label: t('footer.links.categories'),
      href: categoriesHref(locale),
      external: false,
    },
    { label: t('footer.links.submit'), href: submitHref(locale), external: false },
    { label: t('footer.links.privacy'), href: privacyHref(locale), external: false },
  ];

  return (
    <footer className={footerClass}>
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="text-sm text-[var(--text2)]">{line}</div>
        <div className="flex flex-wrap gap-5 text-xs text-[var(--text3)]">
          {links.map(({ label, href, external }) => (
            <a
              key={label}
              href={href}
              className="hover:text-[var(--text2)]"
              target={external ? '_blank' : undefined}
              rel={external ? 'noreferrer' : undefined}
            >
              {external ? (
                <span className="inline-flex items-center gap-1.5">
                  <FaGithub className="h-4 w-4" aria-hidden="true" />
                  <span>{label}</span>
                </span>
              ) : (
                label
              )}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
