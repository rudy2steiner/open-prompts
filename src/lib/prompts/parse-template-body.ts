import { parseSubmitPromptBody, type ParsedSubmitPrompt } from '~/lib/prompts/submit-prompt';
import { parseVisibility, type PromptVisibility } from '~/lib/prompts/template-types';

export type ParsedTemplateBody = ParsedSubmitPrompt & {
  visibility: PromptVisibility;
};

export function parseTemplateBody(
  body: unknown,
): { ok: true; value: ParsedTemplateBody } | { ok: false; error: string } {
  const base = parseSubmitPromptBody(body);
  if (!base.ok) return base;

  const o = body as Record<string, unknown>;
  const visibility = parseVisibility(o.visibility) ?? 'public';

  return { ok: true, value: { ...base.value, visibility } };
}
