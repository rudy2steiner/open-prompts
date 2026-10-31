import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { groupMotionModels, motionModels } from '../src/lib/motion/models';

test('Claude variants count once and only models above 50 have their own group', () => {
  assert.deepEqual(motionModels('Claude Opus / Sonnet / Haiku / Fable'), ['Claude']);
  const entries = [
    ...Array.from({ length: 51 }, (_, i) => ({ id: `c${i}`, model: 'Claude Opus / Sonnet' })),
    ...Array.from({ length: 50 }, (_, i) => ({ id: `g${i}`, model: 'GPT-6 Astra / Gemini Argon' })),
  ];
  const grouped = groupMotionModels(entries);
  assert.deepEqual(grouped.facets, { Claude: 51, Other: 50 });
  assert.deepEqual(grouped.byId.get('g0'), ['Other']);
  assert.deepEqual(grouped.byId.get('c0'), ['Claude']);
});
