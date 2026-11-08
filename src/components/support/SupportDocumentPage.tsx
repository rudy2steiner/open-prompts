import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';
import { supportDocument, type SupportPageType } from '~/lib/support/documents';
import { SUPPORT_EMAIL } from '~/lib/support/email';

function withEmailLink(text: string): ReactNode {
  const parts = text.split(SUPPORT_EMAIL);
  if (parts.length === 1) return text;
  return parts.flatMap((part, index) => index === 0
    ? [part]
    : [
      <a key={index} className="underline" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>,
      part,
    ]);
}

function pagePath(type: SupportPageType) {
  return `/${type}`;
}

export function supportMetadata(type: SupportPageType) {
  return async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const locale = normalizeLocale((await params).locale);
    setRequestLocale(locale);
    const doc = supportDocument(locale, type);
    return buildPageMetadata({ locale, path: pagePath(type), title: doc.title, description: doc.description });
  };
}

export function SupportDocumentPage({ locale, type }: { locale: string; type: SupportPageType }) {
  const doc = supportDocument(locale, type);
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <OpenPromptsSiteHeader locale={locale} activeNav="account" langPathSuffix={pagePath(type)} />
      <main className="mx-auto w-full max-w-3xl px-5 py-12 md:px-6">
        <h1 className="text-3xl font-semibold">{doc.title}</h1>
        <p className="mt-3 text-sm text-[var(--text3)]">{doc.updated}</p>
        <p className="mt-4 text-sm leading-6 text-[var(--text2)]">{withEmailLink(doc.intro)}</p>
        {doc.sections.map((section) => (
          <section key={section.title} className="mt-8">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--text2)]">{withEmailLink(section.body)}</p>
          </section>
        ))}
      </main>
      <OpenPromptsSiteFooter locale={locale} />
    </div>
  );
}
