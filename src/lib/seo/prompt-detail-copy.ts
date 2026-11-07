import { getTranslations } from 'next-intl/server';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { resolvePromptCategory } from '~/lib/prompts/prompt-categories';

export type PromptDetailFaq = { q: string; a: string };
export type PromptDetailStep = { t: string; d: string };

export type PromptDetailCopy = {
  howtoTitle: string;
  steps: PromptDetailStep[];
  faqTitle: string;
  faqs: PromptDetailFaq[];
  relatedTitle: string;
  alsoLabel: string;
  modelLink: string;
  categoryLink: string;
};

function fill(template: string, vars: Record<string, string>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? '');
}

export async function getPromptDetailCopy(locale: string, prompt: PromptGalleryItem): Promise<PromptDetailCopy> {
  const t = await getTranslations({ locale, namespace: 'OpenPrompts.promptPage.seoSections' });
  const categoryKey = resolvePromptCategory(prompt.category, prompt.tags);
  const category = categoryKey
    ? (await getTranslations({ locale, namespace: 'OpenPrompts.submitPage' }))(`categories.${categoryKey}`)
    : t('fallbackCategory');
  const tags = prompt.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 5);
  const author = prompt.authorHandle?.trim().replace(/^@/, '');
  const vars = {
    title: prompt.title.trim(),
    model: prompt.model.trim() || 'GPT Image 2',
    category,
    tags: tags.join(' · ') || category,
    author: author ? `@${author}` : '',
  };
  const steps = (t.raw('howto.steps') as PromptDetailStep[]).map((step) => ({
    t: fill(step.t, vars),
    d: fill(step.d, vars),
  }));
  const faqs = (t.raw('faq.items') as PromptDetailFaq[]).map((item) => ({
    q: fill(item.q, vars),
    a: fill(item.a, vars),
  }));
  if (faqs[2]) {
    const notes = [
      author ? fill(t.raw('faq.authorNote') as string, vars) : '',
      prompt.sourceUrl ? fill(t.raw('faq.sourceNote') as string, vars) : '',
    ].filter(Boolean);
    if (notes.length) faqs[2] = { ...faqs[2], a: `${faqs[2].a} ${notes.join(' ')}` };
  }
  return {
    howtoTitle: fill(t.raw('howto.title') as string, vars),
    steps,
    faqTitle: fill(t.raw('faq.title') as string, vars),
    faqs,
    relatedTitle: fill(t.raw('related.title') as string, vars),
    alsoLabel: t('related.also'),
    modelLink: fill(t.raw('related.model') as string, vars),
    categoryLink: fill(t.raw('related.category') as string, vars),
  };
}
