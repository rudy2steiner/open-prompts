import { desc } from 'drizzle-orm';
import type { PromptGalleryItem } from '~/data/promptGallery';
import { getDb } from '~/db/client';
import { prompts } from '~/db/schema';
import { galleryPublicFilter } from '~/lib/prompts/template-record';

function rowToItem(row: {
  slug: string;
  title: string;
  description: string | null;
  prompt: string | null;
  templateId: string | null;
  model: string | null;
  tags: string[] | null;
  sourceUrl: string | null;
  authorHandle: string | null;
  images: string[] | null;
  createdAt: Date;
}): PromptGalleryItem {
  const tags = Array.isArray(row.tags) ? row.tags.filter((t) => typeof t === 'string' && t.trim()) : [];
  const images = Array.isArray(row.images)
    ? row.images.filter((u) => typeof u === 'string' && u.trim())
    : [];
  const item: PromptGalleryItem = {
    id: row.slug,
    title: row.title?.trim() || 'Untitled',
    description: typeof row.description === 'string' ? row.description : '',
    prompt: typeof row.prompt === 'string' ? row.prompt : '',
    model: row.model?.trim() || 'GPT Image 2',
    tags,
    images,
  };
  const tid = row.templateId?.trim();
  if (tid) item.templateId = tid;
  const su = row.sourceUrl?.trim();
  if (su) item.sourceUrl = su;
  const ah = row.authorHandle?.trim();
  if (ah) item.authorHandle = ah;
  item.createdAt = row.createdAt.toISOString();
  return item;
}

/** Loads prompts from Postgres via Drizzle; null if no DATABASE_URL, error, or empty. */
export async function fetchPromptGalleryFromDb(): Promise<PromptGalleryItem[] | null> {
  const db = getDb();
  if (!db) return null;

  try {
    const rows = await db
      .select({
        slug: prompts.slug,
        title: prompts.title,
        description: prompts.description,
        prompt: prompts.prompt,
        templateId: prompts.templateId,
        model: prompts.model,
        tags: prompts.tags,
        sourceUrl: prompts.sourceUrl,
        authorHandle: prompts.authorHandle,
        images: prompts.images,
        createdAt: prompts.createdAt,
      })
      .from(prompts)
      .where(galleryPublicFilter())
      .orderBy(desc(prompts.createdAt), desc(prompts.id));

    if (!rows.length) return null;
    return rows.map(rowToItem);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[op:prompts:drizzle]', msg);
    return null;
  }
}

/** Alias for older imports / caches still referencing the Supabase client name. */
export const fetchPromptGalleryFromSupabase = fetchPromptGalleryFromDb;
