import fs from 'fs';
import path from 'path';
import { pool } from '../config/db';

// Simple migration runner: applies schema.sql.
async function migrate(): Promise<void> {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf-8');
  await pool.query(sql);
  // eslint-disable-next-line no-console
  console.log('Migration applied successfully.');
  await pool.end();
}

migrate().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', err);
  process.exit(1);
});
