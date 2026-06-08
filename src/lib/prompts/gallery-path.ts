import { buildLocaleHref } from '~/lib/op-locale';
import { normalizeSubmitCategoryKey, type SubmitCategoryKey } from '~/lib/prompts/prompt-categories';

export function galleryHref(
  locale: string,
  params?: { model?: string; category?: string | SubmitCategoryKey },
): string {
  const base = buildLocaleHref(locale, '/gallery');
  if (!params) return base;

  const qs = new URLSearchParams();
  if (params.model && params.model !== 'all') qs.set('model', params.model);
  const cat = params.category ? normalizeSubmitCategoryKey(params.category) : null;
  if (cat) qs.set('category', cat);

  const q = qs.toString();
  return q ? `${base}?${q}` : base;
}
