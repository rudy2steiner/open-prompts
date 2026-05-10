'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { FaGithub } from 'react-icons/fa';

export type OpenPromptsSiteFooterProps = {
  locale: string;
  /** Default: `footer.tagline` from OpenPrompts namespace. */
  tagline?: ReactNode;
  /** `spaced` = gallery/legal (mt-10 py-8); `flush` = create rail layout (py-6 only). */
  spacing?: 'spaced' | 'flush';
};

export function OpenPromptsSiteFooter({ locale, tagline, spacing = 'spaced' }: OpenPromptsSiteFooterProps) {
  const t = useTranslations('OpenPrompts');
  const line = tagline ?? t('footer.tagline');
  const footerClass =
    spacing === 'flush'
      ? 'border-t border-[var(--border)] px-6 py-6'
      : 'mt-10 border-t border-[var(--border)] px-6 py-8';

  const links = [
    { label: t('footer.links.github'), href: 'https://github.com/rudy2steiner/open-prompts' },
    { label: t('footer.links.docs'), href: '#' },
    { label: t('footer.links.deploy'), href: '#' },
    { label: t('footer.links.pricing'), href: '#' },
    { label: t('footer.links.privacy'), href: `/${locale}/privacy-policy` },
  ];

  return (
    <footer className={footerClass}>
      <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="text-sm text-[var(--text2)]">{line}</div>
        <div className="flex flex-wrap gap-5 text-xs text-[var(--text3)]">
          {links.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="hover:text-[var(--text2)]"
              target={href.startsWith('http') ? '_blank' : undefined}
              rel={href.startsWith('http') ? 'noreferrer' : undefined}
            >
              {href.startsWith('http') ? (
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
