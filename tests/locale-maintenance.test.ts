import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { NextRequest } from 'next/server';
import middleware from '../src/middleware';
import { locales } from '../src/config';

test('maintenance protects API routes for every supported locale', () => {
  const previous = process.env.DB_MIGRATION_MODE;
  process.env.DB_MIGRATION_MODE = 'read-only';
  try {
    for (const locale of locales) {
      const response = middleware(new NextRequest(`https://www.open-prompts.com/${locale}/api/prompts`));
      assert.equal(response.status, 503, locale);
      assert.equal(response.headers.get('Retry-After'), '60');
    }
  } finally {
    if (previous === undefined) delete process.env.DB_MIGRATION_MODE;
    else process.env.DB_MIGRATION_MODE = previous;
  }
});
