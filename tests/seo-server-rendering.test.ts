import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'node:test';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

for (const route of ['create', 'submit']) {
  test(`${route} keeps query parsing on the server so the first paint is prerendered`, () => {
    const page = source(`src/app/[locale]/${route}/page.tsx`);
    const client = source(`src/app/[locale]/${route}/PageComponent.tsx`);

    assert.match(page, /searchParams:\s*Promise</);
    assert.doesNotMatch(page, /<Suspense\s+fallback=\{null\}>/);
    assert.doesNotMatch(client, /useSearchParams/);
  });
}
