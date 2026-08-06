import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migrations',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    // Placeholder for local development only; real URLs come from env at runtime.
    url: process.env.DATABASE_URL ?? 'postgres://gymos:gymos@localhost:5432/gymos',
  },
});
