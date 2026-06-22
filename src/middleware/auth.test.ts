import { Response, NextFunction } from 'express';
import { AuthedRequest, requireAuth } from './auth';
import { verifyToken, JwtPayload } from '../utils/jwt';

jest.mock('../utils/jwt');

const mockVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

function buildMocks(overrides: Partial<AuthedRequest> = {}): {
  req: AuthedRequest;
  res: Response;
  next: NextFunction;
} {
  const req = {
    headers: {},
    cookies: {},
    ...overrides,
  } as AuthedRequest;

  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  const next = jest.fn() as NextFunction;

  return { req, res, next };
}

const fakePayload: JwtPayload = { sub: 'user-123', iat: 1000, exp: 9999 };

describe('requireAuth middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('happy path: attaches user and calls next when a valid Bearer token is provided', () => {
    mockVerifyToken.mockReturnValue(fakePayload);

    const { req, res, next } = buildMocks({
      headers: { authorization: 'Bearer valid.jwt.token' },
    });

    requireAuth(req, res, next);

    expect(mockVerifyToken).toHaveBeenCalledWith('valid.jwt.token');
    expect(req.user).toEqual(fakePayload);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('happy path: attaches user and calls next when a valid cookie token is provided', () => {
    mockVerifyToken.mockReturnValue(fakePayload);

    const { req, res, next } = buildMocks({
      headers: {},
      cookies: { token: 'cookie.jwt.token' },
    } as Partial<AuthedRequest>);

    requireAuth(req, res, next);

    expect(mockVerifyToken).toHaveBeenCalledWith('cookie.jwt.token');
    expect(req.user).toEqual(fakePayload);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('error path: returns 401 when no token is present (no header, no cookie)', () => {
    const { req, res, next } = buildMocks({
      headers: {},
      cookies: {},
    });

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('error path: returns 401 when verifyToken throws (invalid or expired token)', () => {
    mockVerifyToken.mockImplementation(() => {
      throw new Error('Token expired');
    });

    const { req, res, next } = buildMocks({
      headers: { authorization: 'Bearer expired.jwt.token' },
    });

    requireAuth(req, res, next);

    expect(mockVerifyToken).toHaveBeenCalledWith('expired.jwt.token');
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('edge case: ignores authorization header that does not start with "Bearer "', () => {
    const { req, res, next } = buildMocks({
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
      cookies: {},
    });

    requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
    expect(next).not.toHaveBeenCalled();
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('edge case: Bearer token takes precedence over cookie token when both are present', () => {
    mockVerifyToken.mockReturnValue(fakePayload);

    const { req, res, next } = buildMocks({
      headers: { authorization: 'Bearer bearer.jwt.token' },
      cookies: { token: 'cookie.jwt.token' },
    } as Partial<AuthedRequest>);

    requireAuth(req, res, next);

    expect(mockVerifyToken).toHaveBeenCalledWith('bearer.jwt.token');
    expect(mockVerifyToken).not.toHaveBeenCalledWith('cookie.jwt.token');
    expect(req.user).toEqual(fakePayload);
    expect(next).toHaveBeenCalledTimes(1);
  });
});