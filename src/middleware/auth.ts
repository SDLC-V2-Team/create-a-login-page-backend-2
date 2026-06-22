import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../utils/jwt';

export interface AuthedRequest extends Request {
  user?: JwtPayload;
}

// Validates the Bearer token (or auth cookie) and attaches the decoded user.
export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.token;
  const token = bearer ?? cookieToken;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
