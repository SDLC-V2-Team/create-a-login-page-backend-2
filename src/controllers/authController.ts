import { Request, Response } from 'express';
import { findUserByUsername, createUser } from '../models/user';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { AuthedRequest } from '../middleware/auth';

export async function register(req: Request, res: Response): Promise<void> {
  const { username, password, email } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

  const existing = await findUserByUsername(username);
  if (existing) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await createUser(username, passwordHash, email ?? null);
  res.status(201).json({ id: user.id, username: user.username });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

  const user = await findUserByUsername(username);
  // Use a constant generic error to avoid user enumeration.
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }

  const token = signToken({ sub: user.id, username: user.username });
  res
    .cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    .json({ token, user: { id: user.id, username: user.username } });
}

export async function me(req: AuthedRequest, res: Response): Promise<void> {
  res.json({ user: req.user });
}

export function logout(_req: Request, res: Response): void {
  res.clearCookie('token').json({ ok: true });
}
