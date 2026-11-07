import type { AppLocale } from './metadata';

export const SITE_BRAND_SUFFIX = ' | Open Prompts';

/** Page segment before ` | Open Prompts`. A result shows about 30 full-width characters; the brand suffix takes about 8, so CJK keeps 22. */
const TITLE_SEGMENT_MAX: Record<AppLocale, number> = {
  en: 45,
  zh: 22,
  ja: 22,
  ko: 25, fr: 45, de: 45, es: 45, pt: 45,
};

const DESCRIPTION_MAX: Record<AppLocale, number> = {
  en: 155,
  zh: 80,
  ja: 80,
  ko: 90, fr: 155, de: 155, es: 155, pt: 155,
};

export function stripBrandSuffix(title: string): string {
  return title.replace(/\s*\|\s*Open Prompts\s*$/i, '').trim();
}

export function clampPageTitleSegment(title: string, locale: string): string {
  const clean = stripBrandSuffix(title).replace(/\s+/g, ' ').trim();
  const max = TITLE_SEGMENT_MAX[locale as AppLocale] ?? TITLE_SEGMENT_MAX.en;
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1)}…`;
}

/** Page segment + layout brand suffix (use with `title.absolute` to avoid double templates). */
export function buildFullPageTitle(segment: string, locale: string): string {
  return `${clampPageTitleSegment(segment, locale)}${SITE_BRAND_SUFFIX}`;
}

export function clampMetaDescription(text: string, locale: string): string {
  const normalized = text.trim().replace(/\s+/g, ' ');
  const max = DESCRIPTION_MAX[locale as AppLocale] ?? DESCRIPTION_MAX.en;
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 1)}…`;
}

const IMAGE_PROMPT_TITLE_SUFFIX: Record<AppLocale, string> = {
  en: '｜AI Image Prompt',
  zh: '｜图片提示词',
  ja: '｜画像プロンプト',
  ko: '｜AI 이미지 프롬프트',
  fr: '｜Prompt d’image IA',
  de: '｜KI-Bild-Prompt',
  es: '｜Prompt de imagen',
  pt: '｜Prompt de imagem',
};

const MOTION_PROMPT_TITLE_SUFFIX: Record<AppLocale, string> = {
  en: '｜AI Motion Prompt',
  zh: '｜动效提示词',
  ja: '｜モーション',
  ko: '｜AI 모션',
  fr: '｜Motion IA',
  de: '｜KI-Motion',
  es: '｜Motion IA',
  pt: '｜Motion IA',
};

/** Drop a leading "AI-generated" when the keyword suffix already says AI. */
function dropRedundantLead(name: string): string {
  const next = name.replace(/^(?:an?\s+)?ai[-\s]?generated\s+/i, '');
  if (!next || next === name) return name;
  return next.charAt(0).toUpperCase() + next.slice(1);
}

/** Shorten on a word boundary so the title does not end mid-word. */
function shortenAtWord(name: string, budget: number): string {
  if (name.length <= budget) return name;
  const limit = budget - 1;
  if (limit < 1) return '…';
  const slice = name.slice(0, limit);
  const space = slice.lastIndexOf(' ');
  const cut = space >= 8 ? slice.slice(0, space) : slice;
  return `${cut.replace(/[\s,.;:!-]+$/, '')}…`;
}

/** Keep the keyword suffix intact and shorten only the page name. */
function fitKeywordTitle(name: string, suffix: string, locale: string): string {
  const max = TITLE_SEGMENT_MAX[locale as AppLocale] ?? TITLE_SEGMENT_MAX.en;
  const trimmed = name.replace(/\s+/g, ' ').trim();
  const budget = Math.max(max - suffix.length, 1);
  const tighter = dropRedundantLead(trimmed);
  const chosen = tighter.length < trimmed.length ? tighter : trimmed;
  return `${chosen.length <= budget ? chosen : shortenAtWord(chosen, budget)}${suffix}`;
}

/** Image prompt detail segment. Layout adds ` | Open Prompts`. */
export function buildPromptPageTitle(title: string, _model: string, locale: string): string {
  const suffix = IMAGE_PROMPT_TITLE_SUFFIX[locale as AppLocale] ?? IMAGE_PROMPT_TITLE_SUFFIX.en;
  return fitKeywordTitle(title, suffix, locale);
}

/** Motion prompt detail segment. Layout adds ` | Open Prompts`. */
export function buildMotionPageTitle(title: string, locale: string): string {
  const suffix = MOTION_PROMPT_TITLE_SUFFIX[locale as AppLocale] ?? MOTION_PROMPT_TITLE_SUFFIX.en;
  return fitKeywordTitle(title, suffix, locale);
}

export function buildPromptSeoDescription(
  prompt: {
    description: string;
    prompt: string;
    title: string;
    model: string;
    tags?: string[];
  },
  locale: string,
  template: string,
): string {
  const snippet = (prompt.description?.trim() || prompt.prompt?.trim() || prompt.title)
    .replace(/\s+/g, ' ')
    .slice(0, 100);
  const tagHint =
    prompt.tags?.length && locale === 'en'
      ? ` Tags: ${prompt.tags.slice(0, 3).join(', ')}.`
      : '';
  const filled = template
    .replace('{model}', prompt.model?.trim() || 'AI')
    .replace('{title}', prompt.title.trim())
    .replace('{snippet}', snippet)
    .replace('{tags}', tagHint);
  return clampMetaDescription(filled, locale);
}
