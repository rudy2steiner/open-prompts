import { randomBytes } from 'node:crypto';

import type { Db } from '~/db/client';
import { prompts } from '~/db/schema';
import {
  parseVisibility,
  resolveStatusForVisibility,
  type PromptVisibility,
} from '~/lib/prompts/template-types';

const CATEGORY_KEYS = new Set([
  'landscape',
  'portrait',
  'architecture',
  'animal',
  'illustration',
  'realism',
  'game',
  'cinematic',
  'scifi',
  'abstract',
]);

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

const MAX_TITLE = 200;
const MAX_DESC = 2000;
const MAX_TAG_LEN = 48;
const MAX_TAGS = 10;
const MAX_IMAGES = 4;
const MAX_IMAGE_CHARS = 600_000;

export type ParsedSubmitPrompt = {
  title: string;
  description: string;
  prompt: string;
  modelLabel: string;
  tags: string[];
  images: string[];
  sourceUrl: string | null;
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

  const modelId = typeof o.modelId === 'string' ? o.modelId.trim() : '';
  if (!MODEL_IDS.has(modelId)) return { ok: false, error: 'Invalid model' };
  const modelLabel = MODEL_LABELS[modelId] ?? modelId;

  const tagList = asTrimmedStrings(o.tags, MAX_TAGS);
  if (tagList.length < 2 || tagList.length > 8) {
    return { ok: false, error: 'Use between 2 and 8 tags' };
  }

  const mergedTags = [category, ...tagList.filter((t) => t !== category)];
  const tags = mergedTags.slice(0, MAX_TAGS);

  const images = normalizeImages(o.images);

  let sourceUrl: string | null = null;
  if (typeof o.sourceUrl === 'string' && o.sourceUrl.trim()) {
    const u = o.sourceUrl.trim().slice(0, 500);
    if (/^https:\/\/(x\.com|twitter\.com)\//i.test(u)) sourceUrl = u;
  }

  const visibility = parseVisibility(o.visibility) ?? 'public';

  return {
    ok: true,
    value: { title, description, prompt, modelLabel, tags, images, sourceUrl, visibility },
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
          tags: value.tags,
          sourceUrl: value.sourceUrl,
          authorHandle: null,
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
