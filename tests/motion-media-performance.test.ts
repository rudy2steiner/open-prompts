import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { getMotionPage, getMotionSummary } from '../src/lib/motion/catalog';

test('hero and default first page use local lightweight preview video', () => {
  const entries = [getMotionSummary('motion-showreel')!, ...getMotionPage().items];
  assert.ok(entries.every(entry => !entry.video || entry.previewVideo?.startsWith('/motion-previews/')));
});
