export type PromptGalleryItem = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  templateId?: string;
  model: string;
  tags: string[];
  sourceUrl?: string;
  authorHandle?: string;
  images: string[];
};

import imported from "./imports/gpt-image2-prompts.json";

type ImportedPrompt = {
  title?: unknown;
  description?: unknown;
  prompt?: unknown;
  tags?: unknown;
  user_name?: unknown;
  source_url?: unknown;
  images?: unknown;
  local_images?: unknown;
  remote_images?: unknown;
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

const IMPORTED = imported as ImportedPrompt[];

export const PROMPT_GALLERY: PromptGalleryItem[] = IMPORTED.map((item, idx) => {
  const title = typeof item.title === "string" ? item.title : `Untitled ${idx + 1}`;
  const description = typeof item.description === "string" ? item.description : "";
  const prompt = typeof item.prompt === "string" ? item.prompt : "";
  const tags = asStringArray(item.tags);
  const images = asStringArray(item.images);

  const authorHandle = typeof item.user_name === "string" ? item.user_name : undefined;
  const sourceUrl = typeof item.source_url === "string" ? item.source_url : undefined;

  const base = slugify(title) || `prompt-${idx + 1}`;
  const id = `${base}-${idx + 1}`;

  return {
    id,
    title,
    description,
    prompt,
    templateId: "japanese-fuji-film-portrait",
    model: "GPT Image 2",
    tags,
    authorHandle,
    sourceUrl,
    images,
  };
});

