import {
  type PromptReviewStatus,
  type PromptVisibility,
  promptReviewStatuses,
  promptVisibilities,
} from '~/db/schema';

export type { PromptReviewStatus, PromptVisibility };

import type { SubmitCategoryKey } from '~/lib/prompts/prompt-categories';

export type TemplateRecord = {
  id: number;
  slug: string;
  title: string;
  description: string;
  prompt: string;
  model: string;
  category: SubmitCategoryKey | null;
  tags: string[];
  images: string[];
  sourceUrl: string | null;
  authorHandle: string | null;
  status: PromptReviewStatus;
  visibility: PromptVisibility;
  submittedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Admin list: template plus optional owner email from `p_users`. */
export type AdminTemplateRecord = TemplateRecord & {
  submitterEmail: string | null;
};

const MODEL_LABEL_TO_ID: Record<string, string> = {
  'GPT Image 2': 'gptImage2',
  Midjourney: 'midjourney',
  'Midjourney v6': 'midjourney',
  'DALL·E 3': 'dalle3',
  'Flux 1.1 Pro': 'flux',
  Flux: 'flux',
  'Stable Diffusion': 'sd',
  'Stable Diffusion XL': 'sd',
  Ideogram: 'ideogram',
  'Ideogram v3': 'ideogram',
};

export function modelLabelToId(label: string): string {
  return MODEL_LABEL_TO_ID[label] ?? 'gptImage2';
}

export function resolveStatusForVisibility(visibility: PromptVisibility): PromptReviewStatus {
  if (visibility === 'public') return 'pending';
  return 'approved';
}

export function parseVisibility(raw: unknown): PromptVisibility | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim() as PromptVisibility;
  return (promptVisibilities as readonly string[]).includes(v) ? v : null;
}

export function parseReviewStatus(raw: unknown): PromptReviewStatus | null {
  if (typeof raw !== 'string') return null;
  const s = raw.trim() as PromptReviewStatus;
  return (promptReviewStatuses as readonly string[]).includes(s) ? s : null;
}

export type TemplateWriteInput = {
  title: string;
  description: string;
  prompt: string;
  modelLabel: string;
  category: SubmitCategoryKey;
  tags: string[];
  images: string[];
  visibility: PromptVisibility;
  sourceUrl?: string | null;
  authorHandle?: string | null;
};
