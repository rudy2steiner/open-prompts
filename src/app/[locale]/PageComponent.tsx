import './landing-page.css';
import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { OpenPromptsSiteFooter } from '~/components/open-prompts/OpenPromptsSiteFooter';
import { OpenPromptsSiteHeader } from '~/components/open-prompts/OpenPromptsSiteHeader';
import { galleryHref } from '~/lib/prompts/gallery-path';
import { formatGalleryStatCount } from '~/lib/prompts/gallery-stats';
import { landingFontClassName } from './landing-fonts';

type Props = {
  locale: string;
  prompts: PromptGalleryItem[];
  children?: ReactNode;
};

const PREVIEW_SLOTS = ['pc1', 'pc2', 'pc3'] as const;
const HERO_PREVIEW_COUNT = 3;

const MODEL_BAR_ITEMS = [
  { key: 'allModels' as const, href: (locale: string) => galleryHref(locale) },
  {
    key: 'gptImage2' as const,
    href: (locale: string) => galleryHref(locale, { model: 'GPT Image 2' }),
  },
  {
    key: 'dalle3' as const,
    href: (locale: string) => galleryHref(locale, { model: 'DALL·E 3' }),
  },
  {
    key: 'midjourney' as const,
    href: (locale: string) => galleryHref(locale, { model: 'Midjourney' }),
  },
  {
    key: 'stableDiffusion' as const,
    href: (locale: string) => galleryHref(locale, { model: 'Stable Diffusion' }),
  },
] as const;

function pickHeroPreviews(prompts: PromptGalleryItem[]): PromptGalleryItem[] {
  const withImages = prompts.filter((p) => p.images[0]);
  if (withImages.length === 0) return [];

  const scored = withImages.map((p) => {
    let score = 0;
    if (p.model === 'GPT Image 2') score += 3;
    if (p.title.length <= 40) score += 1;
    if (p.images.length > 1) score += 1;
    if (/cinematic|portrait|poster|fantasy|editorial/i.test(`${p.title} ${p.description}`)) score += 1;
    return { p, score };
  });
  scored.sort((a, b) => b.score - a.score);

  const center = scored[0]?.p ?? withImages[0];
  const usedIds = new Set<string>([center.id]);
  const sides: PromptGalleryItem[] = [];

  for (const { p } of scored) {
    if (sides.length >= 2) break;
    if (usedIds.has(p.id)) continue;
    if (p.category && sides.some((s) => s.category === p.category)) continue;
    sides.push(p);
    usedIds.add(p.id);
  }

  for (const { p } of scored) {
    if (sides.length >= 2) break;
    if (usedIds.has(p.id)) continue;
    sides.push(p);
    usedIds.add(p.id);
  }

  while (sides.length < 2) {
    const fallback = withImages[(sides.length + 1) % withImages.length];
    if (!usedIds.has(fallback.id)) {
      sides.push(fallback);
      usedIds.add(fallback.id);
    } else {
      break;
    }
  }

  return [sides[0] ?? center, center, sides[1] ?? sides[0] ?? center];
}

export default async function PageComponent({ locale, prompts, children }: Props) {
  const t = await getTranslations({ locale, namespace: 'OpenPrompts' });
  const promptCount = formatGalleryStatCount(prompts.length, locale);
  const promptCountLabel = `${promptCount}+`;
  const previews = pickHeroPreviews(prompts);

  const galleryLink = galleryHref(locale);
  const submitLink = locale === 'en' ? '/submit' : `/${locale}/submit`;

  return (
    <div className={`min-h-screen w-full ${landingFontClassName}`}>
      <OpenPromptsSiteHeader locale={locale} activeNav="home" langPathSuffix="" />

      <main className="w-full">
        <div className="op-landing-hero-wrap">
          <section className="op-landing-hero">
            <div>
              <div className="op-landing-hero-label">{t('hero.eyebrow')}</div>
              <h1 className="op-landing-h1">
                <em>{t('homePage.h1Line2')}</em>
                <br />
                {t('homePage.h1Line3')}
              </h1>
              <p className="op-landing-sub">{t('hero.desc', { count: promptCount })}</p>
              <div className="op-landing-actions">
                <a href={galleryLink} className="op-landing-btn-primary">
                  {t('homePage.browseGallery')}
                </a>
                <a href={submitLink} className="op-landing-btn-ghost">
                  {t('homePage.submitPrompt')}
                </a>
              </div>
              <div className="op-landing-stats">
                {[
                  [promptCountLabel, t('stats.prompts')],
                  ['6,200+', t('stats.members')],
                  [t('stats.daily'), t('stats.newPrompts')],
                  [t('stats.curated'), t('stats.fromX')],
                ].map(([num, label]) => (
                  <div key={String(label)}>
                    <div className="op-landing-stat-num">{num}</div>
                    <div className="op-landing-stat-label">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="op-landing-visual" aria-hidden={previews.length === 0}>
              <div className="op-landing-visual-stage">
                {previews.slice(0, HERO_PREVIEW_COUNT).map((item, i) => (
                  <div
                    key={`${item.id}-${i}`}
                    className={`op-landing-preview-card ${PREVIEW_SLOTS[i] ?? 'pc2'}`}
                  >
                    <div className="op-landing-card-image">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.images[0]}
                        alt=""
                        loading={i === 1 ? 'eager' : 'lazy'}
                        decoding="async"
                        fetchPriority={i === 1 ? 'high' : 'auto'}
                      />
                    </div>
                    <div className="op-landing-card-footer">
                      <div className="op-landing-card-tag-title">{item.title}</div>
                      <div className="op-landing-card-tag-model">{item.model}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <nav className="op-landing-model-bar" aria-label={t('homePage.modelBar.label')}>
            <span className="op-landing-model-bar-label">{t('homePage.modelBar.label')}</span>
            <div className="op-landing-model-pills">
              {MODEL_BAR_ITEMS.map(({ key, href }, i) => (
                <a
                  key={key}
                  href={href(locale)}
                  className={`op-landing-model-pill${i === 0 ? ' is-active' : ''}`}
                >
                  {t(`homePage.modelBar.${key}`)}
                </a>
              ))}
            </div>
          </nav>
        </div>
      </main>

      {children}

      <OpenPromptsSiteFooter locale={locale} />
    </div>
  );
}
