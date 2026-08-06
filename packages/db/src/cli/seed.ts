import { createDb } from '../client';
import { seed } from '../seed';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const { db, close } = createDb(url, 1);
try {
  const result = await seed(db);
  console.log('seeded:', result);
} finally {
  await close();
}
