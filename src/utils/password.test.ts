import bcrypt from 'bcrypt';
import { hashPassword, verifyPassword } from './password';
import { env } from '../config/env';

jest.mock('bcrypt');
jest.mock('../config/env', () => ({
  env: {
    bcryptCost: 12,
  },
}));

const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('hashPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a hashed string for a valid plain password', async () => {
    const plain = 'mySecretPassword123';
    const fakeHash = '$2b$12$fakehashedvalue';
    mockedBcrypt.hash.mockResolvedValue(fakeHash as never);

    const result = await hashPassword(plain);

    expect(mockedBcrypt.hash).toHaveBeenCalledWith(plain, env.bcryptCost);
    expect(result).toBe(fakeHash);
  });

  it('should call bcrypt.hash with cost factor from env config', async () => {
    const plain = 'anotherPassword';
    const fakeHash = '$2b$12$anotherfakehash';
    mockedBcrypt.hash.mockResolvedValue(fakeHash as never);

    await hashPassword(plain);

    expect(mockedBcrypt.hash).toHaveBeenCalledWith(plain, 12);
  });

  it('should handle empty string password', async () => {
    const plain = '';
    const fakeHash = '$2b$12$emptyhash';
    mockedBcrypt.hash.mockResolvedValue(fakeHash as never);

    const result = await hashPassword(plain);

    expect(mockedBcrypt.hash).toHaveBeenCalledWith('', env.bcryptCost);
    expect(result).toBe(fakeHash);
  });

  it('should handle a very long password', async () => {
    const plain = 'a'.repeat(1000);
    const fakeHash = '$2b$12$longhash';
    mockedBcrypt.hash.mockResolvedValue(fakeHash as never);

    const result = await hashPassword(plain);

    expect(mockedBcrypt.hash).toHaveBeenCalledWith(plain, env.bcryptCost);
    expect(result).toBe(fakeHash);
  });
});

describe('verifyPassword', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return true when the plain password matches the hash', async () => {
    const plain = 'correctPassword';
    const hash = '$2b$12$correcthash';
    mockedBcrypt.compare.mockResolvedValue(true as never);

    const result = await verifyPassword(plain, hash);

    expect(mockedBcrypt.compare).toHaveBeenCalledWith(plain, hash);
    expect(result).toBe(true);
  });

  it('should return false when the plain password does not match the hash', async () => {
    const plain = 'wrongPassword';
    const hash = '$2b$12$correcthash';
    mockedBcrypt.compare.mockResolvedValue(false as never);

    const result = await verifyPassword(plain, hash);

    expect(mockedBcrypt.compare).toHaveBeenCalledWith(plain, hash);
    expect(result).toBe(false);
  });
});