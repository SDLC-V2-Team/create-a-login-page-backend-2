import express, { Application, Request, Response, NextFunction } from 'express';
import request from 'supertest';
import router from './auth';

// Mock controllers
jest.mock('../controllers/authController', () => ({
  register: jest.fn((req: Request, res: Response) => res.status(201).json({ message: 'User registered' })),
  login: jest.fn((req: Request, res: Response) => res.status(200).json({ message: 'Logged in', token: 'mock-token' })),
  me: jest.fn((req: Request, res: Response) => res.status(200).json({ id: '1', email: 'test@example.com' })),
  logout: jest.fn((req: Request, res: Response) => res.status(200).json({ message: 'Logged out' })),
}));

// Mock middleware
jest.mock('../middleware/auth', () => ({
  requireAuth: jest.fn((req: Request, res: Response, next: NextFunction) => next()),
}));

import { register, login, me, logout } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

const buildApp = (): Application => {
  const app = express();
  app.use(express.json());
  app.use('/auth', router);
  return app;
};

describe('Auth Router', () => {
  let app: Application;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should call register controller and return 201 on success', async () => {
      (register as jest.Mock).mockImplementation((req: Request, res: Response) =>
        res.status(201).json({ message: 'User registered' })
      );

      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'newuser@example.com', password: 'password123' });

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ message: 'User registered' });
      expect(register).toHaveBeenCalledTimes(1);
    });
  });

  describe('POST /auth/login', () => {
    it('should call login controller and return 200 with token on success', async () => {
      (login as jest.Mock).mockImplementation((req: Request, res: Response) =>
        res.status(200).json({ message: 'Logged in', token: 'mock-token' })
      );

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token', 'mock-token');
      expect(login).toHaveBeenCalledTimes(1);
    });

    it('should return 401 when login credentials are invalid', async () => {
      (login as jest.Mock).mockImplementation((req: Request, res: Response) =>
        res.status(401).json({ message: 'Invalid credentials' })
      );

      const response = await request(app)
        .post('/auth/login')
        .send({ email: 'wrong@example.com', password: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Invalid credentials' });
      expect(login).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /auth/me', () => {
    it('should call requireAuth middleware and me controller when authenticated', async () => {
      (requireAuth as jest.Mock).mockImplementation((req: Request, res: Response, next: NextFunction) => next());
      (me as jest.Mock).mockImplementation((req: Request, res: Response) =>
        res.status(200).json({ id: '1', email: 'test@example.com' })
      );

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ id: '1', email: 'test@example.com' });
      expect(requireAuth).toHaveBeenCalledTimes(1);
      expect(me).toHaveBeenCalledTimes(1);
    });

    it('should return 401 when user is not authenticated', async () => {
      (requireAuth as jest.Mock).mockImplementation((req: Request, res: Response, next: NextFunction) =>
        res.status(401).json({ message: 'Unauthorized' })
      );

      const response = await request(app).get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ message: 'Unauthorized' });
      expect(requireAuth).toHaveBeenCalledTimes(1);
      expect(me).not.toHaveBeenCalled();
    });
  });

  describe('POST /auth/logout', () => {
    it('should call logout controller and return 200 on success', async () => {
      (logout as jest.Mock).mockImplementation((req: Request, res: Response) =>
        res.status(200).json({ message: 'Logged out' })
      );

      const response = await request(app)
        .post('/auth/logout')
        .set('Authorization', 'Bearer mock-token');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: 'Logged out' });
      expect(logout).toHaveBeenCalledTimes(1);
    });
  });
});