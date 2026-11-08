import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const runtimeConfigFiles = [
  '.env.example',
  '.dev.vars.example',
  'README.md',
  'README.zh-CN.md',
  'README.ja-JP.md',
  ...['en', 'zh', 'ja', 'ko', 'fr', 'de', 'es', 'pt'].map(
    (locale) => `messages/${locale}.json`,
  ),
];

test('runtime configuration and user guidance no longer require legacy DATABASE_URL', async () => {
  for (const file of runtimeConfigFiles) {
    const source = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
    assert.doesNotMatch(
      source,
      /(?<!SOURCE_)DATABASE_URL/,
      `${file} still documents the retired runtime variable`,
    );
  }
});

test('the legacy export tool requires an explicit source connection', async () => {
  const source = await readFile(
    new URL('../scripts/d1/export.ts', import.meta.url),
    'utf8',
  );

  assert.match(source, /SOURCE_DATABASE_URL/);
  assert.doesNotMatch(source, /env\.DATABASE_URL/);
});

test('production deploy keeps local dev vars isolated', async () => {
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { scripts: Record<string, string> };
  const deployScript = await readFile(
    new URL('../scripts/deploy-production.sh', import.meta.url),
    'utf8',
  );

  assert.equal(packageJson.scripts.deploy, 'bash scripts/deploy-production.sh');
  assert.match(deployScript, /\.prod\.vars/);
  assert.match(deployScript, /mv \.dev\.vars/);
  assert.match(deployScript, /trap .*EXIT/);
  assert.match(deployScript, /--env=""/);
});
