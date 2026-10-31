import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle/d1',
  dialect: 'sqlite',
  strict: true,
});
