import { and, ilike, isNotNull, ne, or } from 'drizzle-orm';
import type { Db } from '~/db/client';
import { prompts } from '~/db/schema';
import { parseXStatusUrl } from '~/lib/x-import/parse-x-status-url';

export type XSourceDuplicate = {
  id: number;
  title: string;
  slug: string;
  status: string;
  sourceUrl: string | null;
};

export function xStatusIdFromUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  return parseXStatusUrl(raw)?.statusId ?? null;
}

function sourceUrlMatchesStatusId(sourceUrl: string, statusId: string): boolean {
  const stored = parseXStatusUrl(sourceUrl);
  if (stored) return stored.statusId === statusId;
  return sourceUrl.includes(`/${statusId}`);
}

function statusIdUrlPatterns(statusId: string) {
  return or(
    ilike(prompts.sourceUrl, `%/status/${statusId}`),
    ilike(prompts.sourceUrl, `%/status/${statusId}?%`),
    ilike(prompts.sourceUrl, `%/statuses/${statusId}`),
    ilike(prompts.sourceUrl, `%/statuses/${statusId}?%`),
    ilike(prompts.sourceUrl, `%/i/status/${statusId}`),
    ilike(prompts.sourceUrl, `%/i/web/status/${statusId}`),
  );
}

/** Find an existing prompt linked to the same X/Twitter status id. */
export async function findPromptByXStatusUrl(
  db: Db,
  rawUrl: string,
  opts?: { excludeId?: number },
): Promise<XSourceDuplicate | null> {
  const statusId = xStatusIdFromUrl(rawUrl);
  if (!statusId) return null;

  const conditions = [isNotNull(prompts.sourceUrl), statusIdUrlPatterns(statusId)];
  if (opts?.excludeId) conditions.push(ne(prompts.id, opts.excludeId));

  const rows = await db
    .select({
      id: prompts.id,
      title: prompts.title,
      slug: prompts.slug,
      status: prompts.status,
      sourceUrl: prompts.sourceUrl,
    })
    .from(prompts)
    .where(and(...conditions))
    .limit(8);

  for (const row of rows) {
    if (row.sourceUrl && sourceUrlMatchesStatusId(row.sourceUrl, statusId)) {
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        status: row.status,
        sourceUrl: row.sourceUrl,
      };
    }
  }
  return null;
}

export async function checkXSourceDuplicate(
  db: Db,
  sourceUrl: string | null | undefined,
  excludeId?: number,
): Promise<XSourceDuplicate | null> {
  if (!sourceUrl?.trim()) return null;
  if (!xStatusIdFromUrl(sourceUrl)) return null;
  return findPromptByXStatusUrl(db, sourceUrl, { excludeId });
}
