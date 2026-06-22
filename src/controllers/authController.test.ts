import { Request, Response } from 'express';
import { register, login, me, logout } from './authController';
import { findUserByUsername, createUser } from '../models/user';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken } from '../utils/jwt';
import { AuthedRequest } from '../middleware/auth';

jest.mock('../models/user');
jest.mock('../utils/password');
jest.mock('../utils/jwt');

const mockFindUserByUsername = findUserByUsername as jest.MockedFunction<typeof findUserByUsername>;
const mockCreateUser = createUser as jest.MockedFunction<typeof createUser>;
const mockHashPassword = hashPassword as jest.MockedFunction<typeof hashPassword>;
const mockVerifyPassword = verifyPassword as jest.MockedFunction<typeof verifyPassword>;
const mockSignToken = signToken as jest.MockedFunction<typeof signToken>;

function buildRes(): Response {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function buildReq(body: Record<string, unknown> = {}): Request {
  return { body } as Request;
}

describe('register', () => {
  beforeEach(() => jest.clearAllMocks());

  it('happy path: creates a new user and returns 201 with id and username', async () => {
    mockFindUserByUsername.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue('hashed_pw');
    mockCreateUser.mockResolvedValue({ id: 1, username: 'alice', password_hash: 'hashed_pw', email: 'alice@example.com' } as any);

    const req = buildReq({ username: 'alice', password: 'secret', email: 'alice@example.com' });
    const res = buildRes();

    await register(req, res);

    expect(mockFindUserByUsername).toHaveBeenCalledWith('alice');
    expect(mockHashPassword).toHaveBeenCalledWith('secret');
    expect(mockCreateUser).toHaveBeenCalledWith('alice', 'hashed_pw', 'alice@example.com');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 1, username: 'alice' });
  });

  it('edge case: register without email uses null', async () => {
    mockFindUserByUsername.mockResolvedValue(null);
    mockHashPassword.mockResolvedValue('hashed_pw');
    mockCreateUser.mockResolvedValue({ id: 2, username: 'bob', password_hash: 'hashed_pw', email: null } as any);

    const req = buildReq({ username: 'bob', password: 'pass' });
    const res = buildRes();

    await register(req, res);

    expect(mockCreateUser).toHaveBeenCalledWith('bob', 'hashed_pw', null);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('error path: returns 400 when username or password is missing', async () => {
    const req = buildReq({ username: 'alice' });
    const res = buildRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'username and password are required' });
    expect(mockFindUserByUsername).not.toHaveBeenCalled();
  });

  it('error path: returns 409 when username is already taken', async () => {
    mockFindUserByUsername.mockResolvedValue({ id: 1, username: 'alice', password_hash: 'h', email: null } as any);

    const req = buildReq({ username: 'alice', password: 'secret' });
    const res = buildRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Username already taken' });
    expect(mockCreateUser).not.toHaveBeenCalled();
  });
});

describe('login', () => {
  beforeEach(() => jest.clearAllMocks());

  it('happy path: issues JWT token and sets cookie on valid credentials', async () => {
    const fakeUser = { id: 10, username: 'alice', password_hash: 'hashed', email: null };
    mockFindUserByUsername.mockResolvedValue(fakeUser as any);
    mockVerifyPassword.mockResolvedValue(true);
    mockSignToken.mockReturnValue('jwt.token.here');

    const req = buildReq({ username: 'alice', password: 'secret' });
    const res = buildRes();

    await login(req, res);

    expect(mockSignToken).toHaveBeenCalledWith({ sub: 10, username: 'alice' });
    expect(res.cookie).toHaveBeenCalledWith(
      'token',
      'jwt.token.here',
      expect.objectContaining({ httpOnly: true, sameSite: 'lax' }),
    );
    expect(res.json).toHaveBeenCalledWith({
      token: 'jwt.token.here',
      user: { id: 10, username: 'alice' },
    });
  });

  it('error path: returns 400 when username or password is missing', async () => {
    const req = buildReq({ password: 'secret' });
    const res = buildRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'username and password are required' });
    expect(mockFindUserByUsername).not.toHaveBeenCalled();
  });

  it('error path: returns 401 when user does not exist', async () => {
    mockFindUserByUsername.mockResolvedValue(null);

    const req = buildReq({ username: 'unknown', password: 'secret' });
    const res = buildRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    expect(mockSignToken).not.toHaveBeenCalled();
  });

  it('error path: returns 401 when password is incorrect', async () => {
    const fakeUser = { id: 10, username: 'alice', password_hash: 'hashed', email: null };
    mockFindUserByUsername.mockResolvedValue(fakeUser as any);
    mockVerifyPassword.mockResolvedValue(false);

    const req = buildReq({ username: 'alice', password: 'wrong' });
    const res = buildRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid credentials' });
    expect(mockSignToken).not.toHaveBeenCalled();
  });

  it('edge case: sets secure cookie flag in production environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const fakeUser = { id: 10, username: 'alice', password_hash: 'hashed', email: null };
    mockFindUserByUsername.mockResolvedValue(fakeUser as any);
    mockVerifyPassword.mockResolvedValue(true);
    mockSignToken.mockReturnValue('jwt.token.here');

    const req = buildReq({ username: 'alice', password: 'secret' });
    const res = buildRes();

    await login(req, res);

    expect(res.cookie).toHaveBeenCalledWith(
      'token',
      'jwt.token.here',
      expect.objectContaining({ secure: true }),
    );

    process.env.NODE_ENV = originalEnv;
  });
});

describe('me', () => {
  it('happy path: returns the authenticated user from the request', async () => {
    const fakeUser = { sub: 5, username: 'carol' };
    const req = { user: fakeUser } as AuthedRequest;
    const res = buildRes();

    await me(req, res);

    expect(res.json).toHaveBeenCalledWith({ user: fakeUser });
  });
});

describe('logout', () => {
  it('happy path: clears token cookie and responds with ok', () => {
    const req = buildReq();
    const res = buildRes();

    logout(req, res);

    expect(res.clearCookie).toHaveBeenCalledWith('token');
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });
});