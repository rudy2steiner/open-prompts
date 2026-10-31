import type { Metadata } from 'next';
import type { CSSProperties } from 'react';
import { notFound, permanentRedirect } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import '~/app/[locale]/landing-page.css';
import '../motion-prompts.css';
import { getMotion, getMotionSummary } from '~/lib/motion/catalog';
import { buildPageMetadata, normalizeLocale } from '~/lib/seo/metadata';
import { buildLocaleHref } from '~/lib/op-locale';
import { landingFontClassName } from '~/app/[locale]/landing-fonts';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { MotionMedia } from '../MotionMedia';
import { MotionCopyButton } from '../MotionCopyButton';

type Props = { params: Promise<{ locale: string; slug: string }> };

// 公开详情按需静态生成，由边缘缓存复用，不必每次重新渲染。
export function generateStaticParams() { return []; }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const entry = getMotion(slug);
  if (!entry) notFound();
  const language = normalizeLocale(locale);
  const t = await getTranslations({ locale: language, namespace: 'OpenPrompts.promptMotionPage' });
  const title = `${entry.title} · Motion Prompts | Open Prompts`;
  const metadata = buildPageMetadata({ locale: language, path: `/motion-prompts/${entry.slug}`,
    title: entry.title, description: t('detail.description', { title: entry.title, author: entry.author }),
    keywords: ['motion prompts', 'AI motion graphics', entry.title, ...entry.categories],
  });
  return { ...metadata, title: { absolute: title }, openGraph: { ...metadata.openGraph, title, images: entry.poster ? [{ url: entry.poster }] : undefined }, twitter: { ...metadata.twitter, title, images: entry.poster ? [entry.poster] : undefined }, referrer: 'no-referrer' };
}

export default async function MotionDetailPage({ params }: Props) {
  const { locale, slug } = await params;
  const language = normalizeLocale(locale);
  setRequestLocale(language);
  const entry = getMotion(slug);
  if (!entry) notFound();
  if (slug !== entry.slug) permanentRedirect(buildLocaleHref(language, `/motion-prompts/${entry.slug}`));
  const t = await getTranslations({ locale: language, namespace: 'OpenPrompts.promptMotionPage' });
  const backHref = buildLocaleHref(language, '/motion-prompts');
  return <div className={`min-h-screen w-full ${landingFontClassName} motion-page`}>
    <link rel="preload" as="image" href={entry.poster || undefined} fetchPriority="high" />
    <main className="motion-container motion-detail">
      <nav className="motion-breadcrumb" aria-label="Breadcrumb"><a href={backHref}>Motion Prompts</a><span aria-hidden="true">/</span><span>{entry.title}</span></nav>
      <h1>{entry.title}</h1>
      <div className="motion-detail-meta"><span>{t(`categoryNames.${entry.category}`)}</span><span>{entry.model}</span><a className="motion-author" href={entry.sourceUrl} target="_blank" rel="noreferrer">{t('originalPost')} · @{entry.author} ↗</a></div>
      <div className="motion-detail-grid" style={{ '--motion-media-column': `${480 * entry.width / entry.height}px` } as CSSProperties}>
        <div><MotionMedia entry={getMotionSummary(slug)!} /><div className="motion-card-tags">{entry.categories.map(category => <span key={category}>{category}</span>)}</div></div>
        <section className="motion-detail-prompt" aria-labelledby="motion-full-prompt">
          <div className="motion-prompt-head"><h2 id="motion-full-prompt">{t('promptLabel')}</h2><MotionCopyButton prompt={entry.prompt} /></div>
          {entry.requiresReference && <p className="motion-reference">{t('referenceRequired')}</p>}
          <pre tabIndex={0} role="region" aria-labelledby="motion-full-prompt">{entry.prompt}</pre>
          <div className="motion-card-links"><a href={entry.promptSourceUrl} target="_blank" rel="noreferrer">{t('promptSource')} ↗</a>{entry.skillUrl && <a href={entry.skillUrl} target="_blank" rel="noreferrer">{t('skillLabel')}</a>}</div>
        </section>
      </div>
      <a className="motion-detail-back" href={backHref}>{t('detail.back')}</a>
    </main>
    <OpenPromptsSiteFooter locale={language} />
  </div>;
}
