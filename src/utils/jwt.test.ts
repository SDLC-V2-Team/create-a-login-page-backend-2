import jwt from 'jsonwebtoken';
import { JwtPayload, signToken, verifyToken } from './jwt';
import { env } from '../config/env';

jest.mock('../config/env', () => ({
  env: {
    jwtSecret: 'test-secret-key',
    jwtExpiresIn: '1h',
  },
}));

describe('jwt utilities', () => {
  const samplePayload: JwtPayload = {
    sub: 42,
    username: 'testuser',
  };

  describe('signToken', () => {
    it('should return a valid JWT string for a given payload', () => {
      const token = signToken(samplePayload);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should encode the payload fields sub and username in the token', () => {
      const token = signToken(samplePayload);
      const decoded = jwt.decode(token) as Record<string, unknown>;

      expect(decoded).not.toBeNull();
      expect(decoded.sub).toBe(samplePayload.sub);
      expect(decoded.username).toBe(samplePayload.username);
    });
  });

  describe('verifyToken', () => {
    it('should return the original payload when verifying a valid token', () => {
      const token = signToken(samplePayload);
      const result = verifyToken(token);

      expect(result.sub).toBe(samplePayload.sub);
      expect(result.username).toBe(samplePayload.username);
    });

    it('should throw JsonWebTokenError when given a malformed or invalid token', () => {
      const invalidToken = 'not.a.valid.token';

      expect(() => verifyToken(invalidToken)).toThrow();
    });

    it('should throw an error when the token was signed with a different secret', () => {
      const tokenWithWrongSecret = jwt.sign(samplePayload, 'wrong-secret', {
        algorithm: 'HS256',
        expiresIn: '1h',
      });

      expect(() => verifyToken(tokenWithWrongSecret)).toThrow();
    });
  });
});