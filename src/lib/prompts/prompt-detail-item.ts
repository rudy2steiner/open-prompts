export type PromptDetailItem = {
  /** Slug or gallery id used for `?template=` on the create page. */
  id: string;
  title: string;
  description: string;
  prompt: string;
  model: string;
  tags: string[];
  images: string[];
  sourceUrl?: string | null;
  authorHandle?: string | null;
};

export function promptGalleryItemToDetailItem(item: {
  id: string;
  title: string;
  description: string;
  prompt: string;
  model: string;
  tags: string[];
  images: string[];
  sourceUrl?: string;
  authorHandle?: string;
}): PromptDetailItem {
  return {
    id: item.id,
    title: item.title,
    description: item.description ?? '',
    prompt: item.prompt ?? '',
    model: item.model,
    tags: item.tags ?? [],
    images: item.images ?? [],
    sourceUrl: item.sourceUrl ?? null,
    authorHandle: item.authorHandle ?? null,
  };
}

export function templateRecordToDetailItem(row: {
  slug: string;
  title: string;
  description: string;
  prompt: string;
  model: string;
  tags: string[];
  images: string[];
  sourceUrl?: string | null;
  authorHandle?: string | null;
}): PromptDetailItem {
  return {
    id: row.slug,
    title: row.title,
    description: row.description ?? '',
    prompt: row.prompt ?? '',
    model: row.model,
    tags: row.tags ?? [],
    images: row.images ?? [],
    sourceUrl: row.sourceUrl ?? null,
    authorHandle: row.authorHandle ?? null,
  };
}
