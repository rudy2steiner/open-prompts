import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { d1EnvironmentFromWrangler, scriptD1Config } from '../scripts/d1/client';

test('local D1 scripts do not require an account resource id', () => {
  assert.deepEqual(scriptD1Config(false, {}), {
    binding: 'DB',
    database_name: 'open-prompts',
    database_id: 'local',
    remote: false,
  });
});

test('remote D1 scripts require the caller to provide a database id', () => {
  assert.throws(
    () => scriptD1Config(true, {}),
    /D1_DATABASE_ID/,
  );
  assert.deepEqual(scriptD1Config(true, {
    D1_DATABASE_ID: 'database-from-private-environment',
    D1_DATABASE_NAME: 'fork-database',
  }), {
    binding: 'DB',
    database_name: 'fork-database',
    database_id: 'database-from-private-environment',
    remote: true,
  });
});

test('local D1 scripts can reuse the private Wrangler binding without exposing it in source', () => {
  assert.deepEqual(d1EnvironmentFromWrangler(`{
    // This file stays local.
    "d1_databases": [{
      "binding": "DB",
      "database_name": "private-local-name",
      "database_id": "private-local-id"
    }]
  }`), {
    D1_DATABASE_ID: 'private-local-id',
    D1_DATABASE_NAME: 'private-local-name',
  });
});
