import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface JwtPayload {
  sub: number;
  username: string;
}

// ADR-001: JWT signed with HMAC-SHA256 (HS256).
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: env.jwtExpiresIn,
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as JwtPayload;
}
