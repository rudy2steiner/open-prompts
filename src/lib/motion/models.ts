// 按模型系列归类；对比作品可以同时属于多个模型，未注明版本时不推断版本。
const rules: [string, RegExp][] = [
  ['Claude', /\bclaude\b|\bopus\b|\bsonnet\b|\bfable\b|\bhaiku\b/i],
  ['GPT', /\bgpt\b|chatgpt|\bastra\b|\bsol\b/i],
  ['Gemini', /\bgemini\b|\bargon\b/i], ['Kimi', /\bkimi\b/i],
  ['DeepSeek', /\bdeepseek\b/i], ['Qwen', /\bqwen/i], ['GLM', /\bglm\b/i],
  ['MiniMax', /\bminimax\b/i], ['Grok', /\bgrok\b/i],
  ['Seedance', /\bseedance\b/i], ['Wan', /\bwan\b/i],
  ['Muse Wonder', /\bmuse wonder\b/i],
];
export function motionModels(value: string): string[] {
  const models = rules.filter(([, pattern]) => pattern.test(value)).map(([name]) => name);
  return models.length ? models : ['Other'];
}

// 使用全目录去重计数决定热门模型，筛选后不改变分类口径。
export function groupMotionModels(entries: { id: string; model: string }[]) {
  const counts = new Map<string, number>();
  for (const entry of entries) for (const name of motionModels(entry.model)) counts.set(name, (counts.get(name) || 0) + 1);
  const popular = new Set(Array.from(counts).filter(([name, count]) => name !== 'Other' && count > 50).map(([name]) => name));
  const byId = new Map(entries.map(entry => [entry.id, Array.from(new Set(motionModels(entry.model).map(name => popular.has(name) ? name : 'Other')))]));
  const facets: Record<string, number> = {};
  for (const names of Array.from(byId.values())) for (const name of names) facets[name] = (facets[name] || 0) + 1;
  return { byId, facets };
}
