import { randomBytes } from 'node:crypto';

import type { Db } from '~/db/client';
import { prompts } from '~/db/schema';
import {
  parseVisibility,
  resolveStatusForVisibility,
  type PromptVisibility,
} from '~/lib/prompts/template-types';
import { MAX_TITLE } from '~/lib/prompts/template-limits';
import { SUBMIT_CATEGORY_KEYS, type SubmitCategoryKey } from '~/lib/prompts/prompt-categories';

const CATEGORY_KEYS = new Set<string>(SUBMIT_CATEGORY_KEYS);

const MODEL_IDS = new Set([
  'gptImage2',
  'midjourney',
  'dalle3',
  'flux',
  'sd',
  'ideogram',
]);

const MODEL_LABELS: Record<string, string> = {
  gptImage2: 'GPT Image 2',
  midjourney: 'Midjourney',
  dalle3: 'DALL·E 3',
  flux: 'Flux',
  sd: 'Stable Diffusion',
  ideogram: 'Ideogram',
};

const MAX_DESC = 2000;
const MAX_TAG_LEN = 48;
const MAX_TAGS = 10;
const MAX_IMAGES = 8;
const MAX_IMAGE_CHARS = 600_000;

export type ParsedSubmitPrompt = {
  title: string;
  description: string;
  prompt: string;
  modelLabel: string;
  category: SubmitCategoryKey;
  tags: string[];
  images: string[];
  sourceUrl: string | null;
  authorHandle: string | null;
  visibility: PromptVisibility;
};

function slugify(input: string): string {
  const s = String(input)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return s.slice(0, 72) || 'prompt';
}

function asTrimmedStrings(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (out.length >= max) break;
    if (typeof v !== 'string') continue;
    const t = v.trim().slice(0, MAX_TAG_LEN);
    if (t.length === 0) continue;
    if (!out.includes(t)) out.push(t);
  }
  return out;
}

function normalizeImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const v of value) {
    if (out.length >= MAX_IMAGES) break;
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (!t) continue;
    if (!/^https?:\/\//i.test(t) && !t.startsWith('data:')) continue;
    out.push(t.slice(0, MAX_IMAGE_CHARS));
  }
  return out;
}

function normalizeSourceUrl(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const candidate = raw.trim().slice(0, 500);
  if (!/^https?:\/\//i.test(candidate)) return null;
  try {
    const u = new URL(candidate);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.toString();
  } catch {
    return null;
  }
}

function normalizeAuthorHandle(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  return raw.trim().slice(0, 80);
}

export function parseSubmitPromptBody(
  body: unknown,
): { ok: true; value: ParsedSubmitPrompt } | { ok: false; error: string } {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Invalid body' };
  const o = body as Record<string, unknown>;

  const title = typeof o.title === 'string' ? o.title.trim().slice(0, MAX_TITLE) : '';
  if (!title) return { ok: false, error: 'Title is required' };

  const promptRaw = typeof o.prompt === 'string' ? o.prompt.trim() : '';
  if (promptRaw.length < 10) return { ok: false, error: 'Prompt must be at least 10 characters' };
  const prompt = promptRaw;

  const description =
    typeof o.description === 'string' ? o.description.trim().slice(0, MAX_DESC) : '';

  const category = typeof o.category === 'string' ? o.category.trim() : '';
  if (!CATEGORY_KEYS.has(category)) return { ok: false, error: 'Invalid category' };
  const categoryKey = category as SubmitCategoryKey;

  const modelId = typeof o.modelId === 'string' ? o.modelId.trim() : '';
  if (!MODEL_IDS.has(modelId)) return { ok: false, error: 'Invalid model' };
  const modelLabel = MODEL_LABELS[modelId] ?? modelId;

  const tagList = asTrimmedStrings(o.tags, MAX_TAGS).filter((t) => t !== categoryKey);
  if (tagList.length < 2 || tagList.length > 8) {
    return { ok: false, error: 'Use between 2 and 8 tags' };
  }

  const tags = tagList.slice(0, MAX_TAGS);

  const images = normalizeImages(o.images);

  const sourceUrl = normalizeSourceUrl(o.sourceUrl);
  const authorHandle = normalizeAuthorHandle(o.authorHandle);

  const visibility = parseVisibility(o.visibility) ?? 'public';

  return {
    ok: true,
    value: {
      title,
      description,
      prompt,
      modelLabel,
      category: categoryKey,
      tags,
      images,
      sourceUrl,
      authorHandle,
      visibility,
    },
  };
}

export async function insertSubmittedPrompt(
  db: Db,
  value: ParsedSubmitPrompt,
  submittedBy?: string | null,
): Promise<{ id: number; slug: string }> {
  const base = slugify(value.title);

  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = `${base}-${randomBytes(4).toString('hex')}`;
    try {
      const [row] = await db
        .insert(prompts)
        .values({
          slug,
          title: value.title,
          description: value.description,
          prompt: value.prompt,
          templateId: null,
          model: value.modelLabel,
          category: value.category,
          tags: value.tags,
          sourceUrl: value.sourceUrl,
          authorHandle: value.authorHandle,
          images: value.images,
          status: resolveStatusForVisibility(value.visibility),
          visibility: value.visibility,
          submittedBy: submittedBy ?? null,
          sortOrder: 0,
        })
        .returning({ id: prompts.id, slug: prompts.slug });

      if (!row) throw new Error('Insert returned no row');
      return row;
    } catch (e: unknown) {
      const code = typeof e === 'object' && e !== null && 'code' in e ? String((e as { code: unknown }).code) : '';
      if (code === '23505' && attempt < 5) continue;
      throw e;
    }
  }

  throw new Error('Could not allocate unique slug');
}
