import { query } from '../config/db';

export interface User {
  id: number;
  username: string;
  email: string | null;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const rows = await query<User>(
    'SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE username = $1 LIMIT 1',
    [username]
  );
  return rows[0] ?? null;
}

export async function createUser(
  username: string,
  passwordHash: string,
  email: string | null
): Promise<User> {
  const rows = await query<User>(
    `INSERT INTO users (username, email, password_hash)
     VALUES ($1, $2, $3)
     RETURNING id, username, email, password_hash, created_at, updated_at`,
    [username, email, passwordHash]
  );
  return rows[0];
}
