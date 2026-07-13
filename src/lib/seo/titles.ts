import type { AppLocale } from './metadata';

export const SITE_BRAND_SUFFIX = ' | Open Prompts';

const TITLE_SEGMENT_MAX: Record<AppLocale, number> = {
  en: 45,
  zh: 13,
  ja: 13,
};

const DESCRIPTION_MAX: Record<AppLocale, number> = {
  en: 155,
  zh: 80,
  ja: 80,
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

/** Build prompt detail title segment (layout adds ` | Open Prompts`). */
export function buildPromptPageTitle(title: string, model: string, locale: string): string {
  const modelLabel = model?.trim() || 'AI';
  const suffix =
    locale === 'zh'
      ? ` — ${modelLabel} 提示词`
      : locale === 'ja'
        ? ` — ${modelLabel} プロンプト`
        : ` — ${modelLabel} Prompt`;
  const max = (TITLE_SEGMENT_MAX[locale as AppLocale] ?? TITLE_SEGMENT_MAX.en) - suffix.length;
  const trimmed = title.trim();
  const short = trimmed.length > max ? `${trimmed.slice(0, Math.max(max - 1, 6))}…` : trimmed;
  return `${short}${suffix}`;
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
