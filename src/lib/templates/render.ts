import type { PromptTemplate, TemplateVar } from '~/data/promptTemplates';

export type TemplateValues = Record<string, string | number | undefined>;

export type RenderResult = {
  prompt: string;
  negativePrompt?: string;
};

export class TemplateValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateValidationError';
  }
}

function normalizeValue(v: unknown): string | number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return v;
  return String(v);
}

function getValue(def: TemplateVar, values: TemplateValues): string | number | undefined {
  const raw = normalizeValue(values[def.name]);
  if (raw === undefined || raw === '') return def.default as any;
  return raw;
}

function validate(def: TemplateVar, value: string | number | undefined) {
  const isEmpty = value === undefined || value === '';
  if (def.required && isEmpty) throw new TemplateValidationError(`Missing required variable: ${def.name}`);
  if (isEmpty) return;

  if (def.type === 'number') {
    const n = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(n)) throw new TemplateValidationError(`Invalid number for variable: ${def.name}`);
    if (def.min !== undefined && n < def.min) throw new TemplateValidationError(`Variable ${def.name} < min`);
    if (def.max !== undefined && n > def.max) throw new TemplateValidationError(`Variable ${def.name} > max`);
    return;
  }

  if (def.type === 'enum') {
    const s = String(value);
    if (!def.enum?.includes(s)) throw new TemplateValidationError(`Invalid enum for variable: ${def.name}`);
    return;
  }
}

function renderString(template: string, vars: Record<string, string | number | undefined>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const v = vars[key];
    if (v === undefined || v === null) return '';
    return String(v);
  });
}

export function renderPromptTemplate(tpl: PromptTemplate, values: TemplateValues): RenderResult {
  const vars: Record<string, string | number | undefined> = {};
  for (const vdef of tpl.variables) {
    const v = getValue(vdef, values);
    validate(vdef, v);
    vars[vdef.name] = v;
  }

  const prompt = renderString(tpl.template, vars).trim();
  const negativePrompt = tpl.negativeTemplate ? renderString(tpl.negativeTemplate, vars).trim() : undefined;
  return { prompt, negativePrompt: negativePrompt || undefined };
}

