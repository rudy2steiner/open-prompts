import '~/app/[locale]/landing-page.css';
import './motion-prompts.css';
import { getTranslations } from 'next-intl/server';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { landingFontClassName } from '~/app/[locale]/landing-fonts';
import { MOTION_RESOURCES } from '~/data/promptMotion';
import { buildLocaleHref } from '~/lib/op-locale';
import { PromptMotionBoard } from './PromptMotionBoard';
import { MotionMedia } from './MotionMedia';
import { PromptMotionSeo } from './PromptMotionSeo';
import { getMotionSummary, getMotionPage, getMotionFacets } from '~/lib/motion/catalog';

export default async function PageComponent({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: 'OpenPrompts.promptMotionPage' });
  const hero = getMotionSummary('motion-showreel')!;
  return <div className={`min-h-screen w-full ${landingFontClassName} motion-page`}>
    <link rel="preload" as="image" href={hero.poster || undefined} fetchPriority="high" />
    <main>
      <section className="motion-hero motion-container">
        <div className="motion-hero-copy">
          <nav aria-label="Breadcrumb" className="motion-breadcrumb"><a href={buildLocaleHref(locale, '')}>{t('breadcrumb.home')}</a><span aria-hidden="true">/</span><span>Motion Prompts</span></nav>
          <h1>Motion Prompts<span>{t('hero.tagline')}</span></h1>
          <p>{t('hero.desc')}</p>
          <div className="op-landing-actions"><a href="#prompts" className="op-landing-btn-primary">{t('hero.browse')}</a></div>
        </div>
        <figure className="motion-hero-film"><MotionMedia entry={hero} hero preview /><figcaption><span>{hero.title}</span><a href={hero.sourceUrl} target="_blank" rel="noreferrer">@{hero.author}</a><span>{hero.model}</span></figcaption></figure>
      </section>
      <section id="prompts" className="motion-container motion-section">
        <div className="motion-section-heading"><h2>{t('catalog.heading')}</h2></div>
        <PromptMotionBoard locale={locale} initialPage={getMotionPage()} facets={getMotionFacets()} />
      </section>
      <section className="motion-container motion-section motion-resources">
        <div className="motion-section-heading"><h2>{t('resources.heading')}</h2><p>{t('resources.desc')}</p></div>
        <div className="motion-resource-grid">{MOTION_RESOURCES.map(resource => <a key={resource.title} href={resource.url} target="_blank" rel="noreferrer"><strong>{resource.title}</strong><span>{resource.author}</span></a>)}</div>
      </section>
      <PromptMotionSeo locale={locale} />
    </main>
    <OpenPromptsSiteFooter locale={locale} />
  </div>;
}
