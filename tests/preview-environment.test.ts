import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';

function readJsonc(path: string) {
  return JSON.parse(readFileSync(path, 'utf8').replace(/^\s*\/\/.*$/gm, ''));
}

test('the public Wrangler example keeps production and preview resources unbound', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
  const wrangler = readJsonc('wrangler.example.jsonc');
  const preview = wrangler.env?.preview;

  assert.equal(pkg.scripts['preview:deploy'], 'opennextjs-cloudflare build && opennextjs-cloudflare deploy --env preview');
  assert.equal(pkg.scripts['preview:local'], 'opennextjs-cloudflare build && opennextjs-cloudflare preview --env preview');
  assert.equal(wrangler.name, 'YOUR_WORKER_NAME');
  assert.equal(wrangler.d1_databases?.[0]?.database_id, 'YOUR_PRODUCTION_D1_DATABASE_ID');
  assert.equal(preview?.name, 'YOUR_PREVIEW_WORKER_NAME');
  assert.equal(preview?.d1_databases?.[0]?.database_id, 'YOUR_PREVIEW_D1_DATABASE_ID');
  assert.notEqual(preview?.d1_databases?.[0]?.database_id, wrangler.d1_databases?.[0]?.database_id);
  assert.equal(preview?.vars?.DB_MIGRATION_MODE, 'off');
});
