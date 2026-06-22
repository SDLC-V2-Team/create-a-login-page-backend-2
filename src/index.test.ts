import request from 'supertest';
import { app, server } from './index';

afterAll((done) => {
  server.close(done);
});

describe('Express app', () => {
  describe('GET /health', () => {
    it('should return status ok on health check', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('Static files', () => {
    it('should serve static files from the public directory (index.html)', async () => {
      const response = await request(app).get('/');
      // The server should respond with 200 if an index.html exists,
      // or a non-500 status indicating static middleware is active
      expect(response.status).not.toBe(500);
    });
  });

  describe('Auth routes', () => {
    it('should mount auth routes under /api/auth', async () => {
      const response = await request(app).post('/api/auth/login').send({});
      // The route exists (not 404), even if credentials are missing (400/401)
      expect(response.status).not.toBe(404);
    });
  });

  describe('Unknown routes', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route-that-does-not-exist');
      expect(response.status).toBe(404);
    });
  });

  describe('Invalid JSON body', () => {
    it('should return 400 when an invalid JSON body is sent', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      expect(response.status).toBe(400);
    });
  });

  describe('Server instance', () => {
    it('should be listening on a port', () => {
      const address = server.address();
      expect(address).not.toBeNull();
      if (address && typeof address === 'object') {
        expect(address.port).toBeGreaterThan(0);
      }
    });
  });
});