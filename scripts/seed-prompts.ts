/**
 * Upsert bundled prompts via Drizzle (D1，默认本地；--remote 操作正式库).
 * Usage: npm run seed:prompts
 */
import { config } from 'dotenv';
import { sql } from 'drizzle-orm';
import { openScriptDb } from './d1/client';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as schema from '../src/db/schema';

config({ path: '.env.local' });
config({ path: '.env' });

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function slugify(input: string) {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function asStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
}

function fail(msg: string): never {
  console.error(msg);
  process.exit(1);
}

const jsonPath = path.resolve(__dirname, '../src/data/imports/gpt-image2-prompts.json');
const imported = JSON.parse(readFileSync(jsonPath, 'utf8')) as unknown[];
if (!Array.isArray(imported)) fail(`Expected array in ${jsonPath}`);

const rows = imported.map((item: Record<string, unknown>, idx: number) => {
  const title = typeof item.title === 'string' ? item.title : `Untitled ${idx + 1}`;
  const description = typeof item.description === 'string' ? item.description : '';
  const prompt = typeof item.prompt === 'string' ? item.prompt : '';
  const tags = asStringArray(item.tags);
  const images = asStringArray(item.images);
  const authorHandle =
    typeof item.user_name === 'string' ? item.user_name : null;
  const sourceUrl =
    typeof item.source_url === 'string' ? item.source_url : null;
  const base = slugify(title) || `prompt-${idx + 1}`;
  const slug = `${base}-${idx + 1}`;
  return {
    slug,
    title,
    description,
    prompt,
    templateId: 'japanese-fuji-film-portrait',
    model: 'GPT Image 2',
    tags,
    sourceUrl,
    authorHandle,
    images,
    sortOrder: idx,
  };
});

async function main() {
  const client = await openScriptDb();
  const db = client.db;
  const { prompts } = schema;

  const chunkSize = 5;
  try {
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      await db
        .insert(prompts)
        .values(chunk)
        .onConflictDoUpdate({
          target: prompts.slug,
          set: {
            title: sql`excluded.title`,
            description: sql`excluded.description`,
            prompt: sql`excluded.prompt`,
            templateId: sql`excluded.template_id`,
            model: sql`excluded.model`,
            tags: sql`excluded.tags`,
            sourceUrl: sql`excluded.source_url`,
            authorHandle: sql`excluded.author_handle`,
            images: sql`excluded.images`,
            sortOrder: sql`excluded.sort_order`,
            updatedAt: new Date(),
          },
        });
      console.info(`Upserted ${Math.min(i + chunk.length, rows.length)}/${rows.length}`);
    }
    console.info('Done.');
  } finally {
    await client.dispose();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
