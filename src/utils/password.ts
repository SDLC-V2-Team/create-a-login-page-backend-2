import bcrypt from 'bcrypt';
import { env } from '../config/env';

// ADR-002: bcrypt with cost factor 12.
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.bcryptCost);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
